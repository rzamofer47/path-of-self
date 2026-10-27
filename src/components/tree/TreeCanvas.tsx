import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { subscribeXpFeedback, updateNodePosition } from '@/src/database/queryEngine';
import { getHistoricalAxisMaxes, getNenRadarDisplayContext } from '@/src/database/nenHistory';
import { getCelebratedNenPeaks, setCelebratedNenPeak } from '@/src/storage/localPrefs';
import type { XpFeedbackEventType } from '@/src/utils/xpFeedback';

import { EMPTY_NEN_PROFILE, NenAxisId, NEN_AXIS_IDS_ORDER, NEN_PALETA, resolveNenAxisId, resolveRootMotherAxisId } from '@/src/config/nenConfig';
import type { NenProfile } from '@/src/config/nenConfig';
import { logNenAxisVertienteSync } from '@/src/utils/nenEngine';
import { axisIdsInActiveDecay, NenAxisDecayInsight } from '@/src/utils/nenDecayEngine';
import { AppTheme, CalidadSesion, DecayCategoria, SkillNode, User } from '@/src/types';
import {
  CANVAS_ZOOM,
  clampZoom,
  computeFitScale,
  isDetailZoom,
  zoomAroundPoint,
} from '@/src/utils/canvasZoom';
import {
  computeFocusTransform,
  computeMapCenterTransform,
  pickFocusDayNodes,
} from '@/src/utils/canvasFocus';
import { isDraggableNode, isRootNode, isShadowLayerNode, normalizeTreeDisplayNode, dedupeVisibleTreeNodes } from '@/src/utils/nodeMenuPolicy';
import { isNodeActiveInRoutine } from '@/src/utils/nodeIntensity';
import { isDailyVerifiedToday } from '@/src/utils/dailyVerification';
import { isWildcardNode } from '@/src/utils/wildcardNodes';
import { MAP_ORIGIN_X, MAP_ORIGIN_Y } from '@/src/utils/mapGeometry';
import { computeLabelVisibilityMap } from '@/src/utils/labelVisibility';
import { isPositionInNodeSector } from '@/src/utils/sectorDragValidation';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  ORB_RADIUS,
  SPACE_BG,
} from '@/src/utils/treeLayout';
import {
  computeForceDirectedLayout,
  ENABLE_FORCE_DIRECTED_LAYOUT,
  mergeNodeWithDisplayPosition,
} from '@/src/utils/forceDirectedLayout';

import { CustomNode } from './CustomNode';
import { CanvasNodeMenuOverlay } from './CanvasNodeMenuOverlay';
import { LockedCatalogNode } from './LockedCatalogNode';
import { NodeInfoModal } from './NodeInfoModal';
import { SessionQualityModal } from './SessionQualityModal';
import { NodeOrbitLabel } from './NodeOrbitLabel';
import { ShadowGuideNode } from './ShadowGuideNode';
import { TreeConnections } from './TreeConnections';
import { TreeSpaceBackground } from './TreeSpaceBackground';
import { ZoomControls } from './ZoomControls';
import { NenRadarChart, getNenRadarFootprintSize } from '@/src/components/nen/NenRadarChart';
import { NenHexagonDetailPanel } from '@/src/components/nen/NenHexagonDetailPanel';
import { NenMotherPanel } from '@/src/components/nen/NenMotherPanel';
import { useNenHatsu } from '@/src/context/NenHatsuContext';

interface TreeCanvasProps {
  nodes: SkillNode[];
  theme: AppTheme;
  user: User | null;
  onAddXp: (nodeId: number) => void;
  onDailyVerify: (nodeId: number, calidad: CalidadSesion) => boolean | Promise<boolean>;
  onAddSubSkill: (parent: SkillNode) => void;
  onAdoptGuide: (guide: SkillNode) => void;
  onDeleteNode: (node: SkillNode) => void;
  onRenameNode: (node: SkillNode) => void;
  onConfigureWildcard: (node: SkillNode, name: string, decayCategoria?: DecayCategoria) => void;
  onPersistPosition?: () => Promise<void>;
  focusNodeIds?: number[];
  focusRequestKey?: number;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const ESTIMATED_VIEWPORT_H = SCREEN_H * 0.72;
const CANVAS_PAN_MIN_DISTANCE = 12;
const PAN_DISMISS_MENU_PX = 20;
const DEFAULT_START_SCALE = 0.58;

function buildInitialCamera(viewportWidth = SCREEN_W, viewportHeight = ESTIMATED_VIEWPORT_H) {
  const fit = computeFitScale(viewportWidth, viewportHeight);
  const scale = clampZoom(Math.max(fit * 1.2, DEFAULT_START_SCALE), fit, CANVAS_ZOOM.MAX);
  return computeMapCenterTransform(viewportWidth, viewportHeight, scale);
}

const INITIAL_CAMERA = buildInitialCamera();
const CENTER_NEN_CHART_SIZE = 400;
const CENTER_NEN_SIZE = getNenRadarFootprintSize(CENTER_NEN_CHART_SIZE);
const CENTER_NEN_OFFSET = (CANVAS_WIDTH - CENTER_NEN_SIZE) / 2;

/** Comodines debajo; custom/hijos encima. Raíces: mayor ángulo encima (hit test predecible). */
function compareForegroundRenderOrder(a: SkillNode, b: SkillNode): number {
  const rank = (node: SkillNode) => {
    if (isWildcardNode(node)) return 0;
    if (node.layer === 'root') return 1;
    return 2;
  };
  const diff = rank(a) - rank(b);
  if (diff !== 0) return diff;

  if (isRootNode(a) && isRootNode(b)) {
    const centerAx = a.posX + ORB_RADIUS;
    const centerAy = a.posY + ORB_RADIUS;
    const centerBx = b.posX + ORB_RADIUS;
    const centerBy = b.posY + ORB_RADIUS;
    const angleA = Math.atan2(centerAy - MAP_ORIGIN_Y, centerAx - MAP_ORIGIN_X);
    const angleB = Math.atan2(centerBy - MAP_ORIGIN_Y, centerBx - MAP_ORIGIN_X);
    return angleA - angleB;
  }

  return a.id - b.id;
}

function CriticalFlashOverlay({ onDone }: { onDone: () => void }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(0.72, { duration: 120, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 680, easing: Easing.in(Easing.quad) }, (finished) => {
        if (finished) runOnJS(onDone)();
      })
    );
  }, [onDone, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.criticalFlash, style]}
    />
  );
}

const NEN_AXIS_IDS = NEN_AXIS_IDS_ORDER;

export function TreeCanvas({
  nodes,
  theme,
  user,
  onAddXp,
  onDailyVerify,
  onAddSubSkill,
  onAdoptGuide,
  onDeleteNode,
  onRenameNode,
  onConfigureWildcard,
  onPersistPosition,
  focusNodeIds,
  focusRequestKey = 0,
}: TreeCanvasProps) {
  const hatsu = useNenHatsu();
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  /** Posición congelada al abrir menú — el orbe no salta aunque cambie el layout. */
  const [activeNodeAnchor, setActiveNodeAnchor] = useState<{
    nodeId: number;
    posX: number;
    posY: number;
  } | null>(null);
  const [infoNodeId, setInfoNodeId] = useState<number | null>(null);
  const [infoNodeSnapshot, setInfoNodeSnapshot] = useState<SkillNode | null>(null);
  const infoOpenRef = useRef(false);
  const [draggingNodeId, setDraggingNodeId] = useState<number | null>(null);
  const [positionOverrides, setPositionOverrides] = useState<
    Record<number, { posX: number; posY: number }>
  >({});
  const [forceLayoutPositions, setForceLayoutPositions] = useState<
    Record<number, { posX: number; posY: number }>
  >({});
  const positionOverridesRef = useRef(positionOverrides);
  positionOverridesRef.current = positionOverrides;
  const [viewportSize, setViewportSize] = useState({ width: SCREEN_W, height: SCREEN_H * 0.72 });
  const [minScale, setMinScale] = useState(0.18);
  const [canvasScale, setCanvasScale] = useState(INITIAL_CAMERA.scale);
  const [viewCamera, setViewCamera] = useState({
    translateX: INITIAL_CAMERA.translateX,
    translateY: INITIAL_CAMERA.translateY,
    scale: INITIAL_CAMERA.scale,
  });
  const layoutReady = useRef(false);
  const viewportSizeRef = useRef({ width: SCREEN_W, height: SCREEN_H * 0.72 });
  const [xpFlashByNode, setXpFlashByNode] = useState<
    Record<number, { tick: number; kind: XpFeedbackEventType }>
  >({});
  const [connectionPulse, setConnectionPulse] = useState<{ tick: number; nodeIds: number[] }>({
    tick: 0,
    nodeIds: [],
  });
  const [criticalFlashTick, setCriticalFlashTick] = useState(0);
  const [nenProfile, setNenProfile] = useState<NenProfile>(EMPTY_NEN_PROFILE);
  const [nenDecayInsights, setNenDecayInsights] = useState<NenAxisDecayInsight[]>([]);
  const [nenDetailOpen, setNenDetailOpen] = useState(false);
  const [nenMotherPanelVisible, setNenMotherPanelVisible] = useState(false);
  const [nenMotherPanelAxis, setNenMotherPanelAxis] = useState<NenAxisId | null>(null);
  const [focusModeActive, setFocusModeActive] = useState(false);
  const [invalidDropTicks, setInvalidDropTicks] = useState<Record<number, number>>({});
  const [verifiedOptimistic, setVerifiedOptimistic] = useState<Record<number, string>>({});
  const [verifiedOptimisticQuality, setVerifiedOptimisticQuality] = useState<
    Record<number, CalidadSesion>
  >({});
  const [qualityPickerNodeId, setQualityPickerNodeId] = useState<number | null>(null);
  const [celebratingAxis, setCelebratingAxis] = useState<NenAxisId | null>(null);
  const [celebrationTick, setCelebrationTick] = useState(0);
  const defaultCameraRef = useRef({
    scale: INITIAL_CAMERA.scale,
    translateX: INITIAL_CAMERA.translateX,
    translateY: INITIAL_CAMERA.translateY,
  });

  const translateX = useSharedValue(INITIAL_CAMERA.translateX);
  const translateY = useSharedValue(INITIAL_CAMERA.translateY);
  const scale = useSharedValue(INITIAL_CAMERA.scale);
  const savedX = useSharedValue(INITIAL_CAMERA.translateX);
  const savedY = useSharedValue(INITIAL_CAMERA.translateY);
  const savedScale = useSharedValue(INITIAL_CAMERA.scale);
  const minScaleSv = useSharedValue(0.18);
  const menuDismissedDuringPan = useSharedValue(false);

  const detailMode = isDetailZoom(canvasScale);

  const displayNodes = useMemo(() => {
    const normalized = nodes.map((node) => {
      const optimisticAt = verifiedOptimistic[node.id];
      let patched: SkillNode = node;

      if (optimisticAt) {
        patched = {
          ...node,
          dailyVerifiedAt: optimisticAt,
          sessionQuality: verifiedOptimisticQuality[node.id] ?? node.sessionQuality,
        };
        if (node.layer === 'locked') {
          patched = { ...patched, layer: 'custom' };
        }
      }

      return normalizeTreeDisplayNode(patched);
    });
    return dedupeVisibleTreeNodes(normalized);
  }, [nodes, verifiedOptimistic, verifiedOptimisticQuality]);

  useEffect(() => {
    setVerifiedOptimistic((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const [idStr, ts] of Object.entries(prev)) {
        const id = Number(idStr);
        const node = nodes.find((n) => n.id === id);
        if (node && isDailyVerifiedToday(node)) {
          delete next[id];
          changed = true;
        } else if (!node) {
          delete next[id];
          changed = true;
        } else if (node.dailyVerifiedAt === ts) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [nodes]);

  useEffect(() => {
    setVerifiedOptimisticQuality((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const idStr of Object.keys(prev)) {
        const id = Number(idStr);
        if (!(id in verifiedOptimistic)) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [verifiedOptimistic]);

  const reloadNenProfile = useCallback(() => {
    const sourceNodes = displayNodes.filter(
      (node) => !node.isDeleted && node.id > 0 && node.layer !== 'dormant'
    );
    logNenAxisVertienteSync(sourceNodes);
    void getNenRadarDisplayContext(sourceNodes).then(({ displayProfile, insights }) => {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.log('[Nen] Perfil radar (vivo + decay):', JSON.stringify(displayProfile));
      }
      setNenProfile(displayProfile);
      setNenDecayInsights(insights);
    });
  }, [displayNodes]);

  const nenCoolingAxes = useMemo(
    () => axisIdsInActiveDecay(nenDecayInsights),
    [nenDecayInsights]
  );

  useEffect(() => {
    reloadNenProfile();
  }, [reloadNenProfile]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const profile = nenProfile;
      const [historical, celebrated] = await Promise.all([
        getHistoricalAxisMaxes(),
        getCelebratedNenPeaks(),
      ]);
      if (cancelled) return;

      for (const axisId of NEN_AXIS_IDS) {
        const current = profile[axisId];
        const prevCelebrated = celebrated[axisId] ?? 0;
        const histMax = historical[axisId] ?? 0;
        if (current > prevCelebrated + 0.05 && current >= histMax - 0.05) {
          await setCelebratedNenPeak(axisId, current);
          setCelebratingAxis(axisId);
          setCelebrationTick(Date.now());
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nenProfile]);

  useEffect(() => {
    return subscribeXpFeedback((payload) => {
      reloadNenProfile();
      if (payload.sourceNodeId != null) {
        setXpFlashByNode((prev) => ({
          ...prev,
          [payload.sourceNodeId!]: {
            tick: Date.now(),
            kind: payload.eventType,
          },
        }));
      }
      if (payload.eventType === 'generationComplete' && payload.connectedNodeIds?.length) {
        setConnectionPulse({ tick: Date.now(), nodeIds: payload.connectedNodeIds });
      }
      if (payload.eventType === 'criticalMilestone') {
        setCriticalFlashTick(Date.now());
      }
    });
  }, [reloadNenProfile]);

  const layoutInputKey = useMemo(
    () =>
      nodes
        .filter((node) => !node.isDeleted && node.layer !== 'dormant')
        .map(
          (node) =>
            `${node.id}|${node.parentId ?? ''}|${node.posX}|${node.posY}|${node.slug ?? ''}|${node.layer}`
        )
        .join(';'),
    [nodes]
  );

  useEffect(() => {
    if (!ENABLE_FORCE_DIRECTED_LAYOUT) return;

    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      const pinned = new Map<number, { x: number; y: number }>();
      for (const [idStr, pos] of Object.entries(positionOverridesRef.current)) {
        pinned.set(Number(idStr), {
          x: pos.posX + ORB_RADIUS,
          y: pos.posY + ORB_RADIUS,
        });
      }

      const result = computeForceDirectedLayout(nodes, pinned);
      if (!cancelled && result) {
        setForceLayoutPositions(result);
      }
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [layoutInputKey, nodes]);

  const withDisplayPosition = useCallback(
    (node: SkillNode): SkillNode =>
      mergeNodeWithDisplayPosition(node, forceLayoutPositions, positionOverrides),
    [forceLayoutPositions, positionOverrides]
  );

  const lockedCatalog = useMemo(
    () => displayNodes.filter((node) => node.layer === 'locked').map(withDisplayPosition),
    [displayNodes, withDisplayPosition]
  );

  const shadowGuides = useMemo(
    () => displayNodes.filter((node) => isShadowLayerNode(node)).map(withDisplayPosition),
    [displayNodes, withDisplayPosition]
  );

  const foregroundNodes = useMemo(() => {
    return displayNodes
      .filter((node) => !isShadowLayerNode(node) && node.layer !== 'locked')
      .map(withDisplayPosition)
      .sort(compareForegroundRenderOrder);
  }, [displayNodes, withDisplayPosition]);

  const connectionNodes = useMemo(
    () =>
      displayNodes
        .filter((node) => !node.isDeleted && node.layer !== 'dormant' && node.id > 0)
        .map(withDisplayPosition),
    [displayNodes, withDisplayPosition]
  );

  const shadowLayerElevated =
    activeNodeId !== null && shadowGuides.some((node) => node.id === activeNodeId);

  const canvasMenuOpen = activeNodeId !== null;

  const labelNodes = useMemo(() => {
    if (!detailMode) return [];
    return connectionNodes.filter(
      (node) => node.layer !== 'dormant' && node.layer !== 'wildcard' && node.id > 0
    );
  }, [connectionNodes, detailMode]);

  const labelVisibilityMap = useMemo(
    () => computeLabelVisibilityMap(labelNodes, activeNodeId, detailMode),
    [labelNodes, activeNodeId, detailMode]
  );

  const applyActiveAnchor = useCallback(
    (node: SkillNode): SkillNode => {
      if (
        activeNodeId === node.id &&
        activeNodeAnchor != null &&
        activeNodeAnchor.nodeId === node.id
      ) {
        return { ...node, posX: activeNodeAnchor.posX, posY: activeNodeAnchor.posY };
      }
      return node;
    },
    [activeNodeAnchor, activeNodeId]
  );

  const activeNodeForMenu = useMemo(() => {
    if (activeNodeId == null || activeNodeAnchor == null) return null;
    if (activeNodeAnchor.nodeId !== activeNodeId) return null;
    const live =
      displayNodes.find((node) => node.id === activeNodeId) ??
      nodes.find((node) => node.id === activeNodeId);
    if (!live) return null;
    return withDisplayPosition(
      normalizeTreeDisplayNode({
        ...live,
        posX: activeNodeAnchor.posX,
        posY: activeNodeAnchor.posY,
      })
    );
  }, [activeNodeId, activeNodeAnchor, displayNodes, nodes, withDisplayPosition]);

  const closeMenu = useCallback(() => {
    setActiveNodeId(null);
    setActiveNodeAnchor(null);
  }, []);

  const lockedCatalogToRender = useMemo(() => {
    if (detailMode) {
      return lockedCatalog;
    }

    return lockedCatalog.filter(
      (node) =>
        isNodeActiveInRoutine(node, connectionNodes, user) ||
        connectionNodes.some(
          (child) =>
            child.parentId === node.id &&
            isNodeActiveInRoutine(child, connectionNodes, user)
        )
    );
  }, [connectionNodes, detailMode, lockedCatalog, user]);

  const infoNode = useMemo(() => {
    if (infoNodeId == null) return null;
    return nodes.find((n) => n.id === infoNodeId) ?? infoNodeSnapshot;
  }, [nodes, infoNodeId, infoNodeSnapshot]);

  const handleShowInfo = useCallback((node: SkillNode) => {
    setInfoNodeSnapshot(node);
    setInfoNodeId(node.id);
    infoOpenRef.current = true;
  }, []);

  const handleCloseInfo = useCallback(() => {
    setInfoNodeId(null);
    setInfoNodeSnapshot(null);
    infoOpenRef.current = false;
  }, []);

  const syncViewCamera = useCallback((tx: number, ty: number, s: number) => {
    setViewCamera({ translateX: tx, translateY: ty, scale: s });
    setCanvasScale(s);
  }, []);

  const applyViewportLayout = useCallback(
    (width: number, height: number) => {
      const prev = viewportSizeRef.current;
      const sizeChanged =
        Math.abs(prev.width - width) > 1 || Math.abs(prev.height - height) > 1;
      viewportSizeRef.current = { width, height };
      setViewportSize({ width, height });
      const fit = computeFitScale(width, height);
      setMinScale(fit);
      minScaleSv.value = fit;

      if (!layoutReady.current) {
        layoutReady.current = true;
        const startScale = clampZoom(Math.max(fit * 1.2, DEFAULT_START_SCALE), fit, CANVAS_ZOOM.MAX);
        const center = computeMapCenterTransform(width, height, startScale);
        scale.value = startScale;
        translateX.value = center.translateX;
        translateY.value = center.translateY;
        savedScale.value = startScale;
        savedX.value = center.translateX;
        savedY.value = center.translateY;
        defaultCameraRef.current = {
          scale: startScale,
          translateX: center.translateX,
          translateY: center.translateY,
        };
        syncViewCamera(center.translateX, center.translateY, startScale);
      } else if (sizeChanged) {
        minScaleSv.value = fit;
      }
    },
    [minScaleSv, savedScale, savedX, savedY, scale, syncViewCamera, translateX, translateY]
  );

  const handleViewportLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      if (width > 0 && height > 0) {
        applyViewportLayout(width, height);
      }
    },
    [applyViewportLayout]
  );

  const applyZoomFactor = useCallback(
    (factor: number) => {
      const focalX = viewportSize.width / 2;
      const focalY = viewportSize.height / 2;
      const next = clampZoom(scale.value * factor, minScale, CANVAS_ZOOM.MAX);
      const t = zoomAroundPoint(
        scale.value,
        next,
        translateX.value,
        translateY.value,
        focalX,
        focalY
      );
      scale.value = next;
      translateX.value = t.x;
      translateY.value = t.y;
      savedScale.value = next;
      savedX.value = t.x;
      savedY.value = t.y;
      syncViewCamera(t.x, t.y, next);
    },
    [minScale, scale, syncViewCamera, translateX, translateY, savedScale, savedX, savedY, viewportSize]
  );

  const handleZoomIn = useCallback(() => {
    applyZoomFactor(CANVAS_ZOOM.STEP);
  }, [applyZoomFactor]);

  const handleZoomOut = useCallback(() => {
    applyZoomFactor(1 / CANVAS_ZOOM.STEP);
  }, [applyZoomFactor]);

  const animateCameraTo = useCallback(
    (targetScale: number, targetX: number, targetY: number, duration = 420) => {
      scale.value = withTiming(targetScale, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
      translateX.value = withTiming(targetX, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
      translateY.value = withTiming(targetY, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
      savedScale.value = targetScale;
      savedX.value = targetX;
      savedY.value = targetY;
      syncViewCamera(targetX, targetY, targetScale);
    },
    [savedScale, savedX, savedY, scale, syncViewCamera, translateX, translateY]
  );

  const applyFocusToNodes = useCallback(
    (targetNodes: SkillNode[]) => {
      if (targetNodes.length === 0) return;
      const transform = computeFocusTransform(
        targetNodes,
        viewportSize.width,
        viewportSize.height,
        minScale
      );
      animateCameraTo(transform.scale, transform.translateX, transform.translateY);
      setFocusModeActive(true);
      closeMenu();
    },
    [animateCameraTo, closeMenu, minScale, viewportSize]
  );

  const handleToggleFocus = useCallback(() => {
    const targetScale = defaultCameraRef.current.scale || scale.value;
    const center = computeMapCenterTransform(
      viewportSize.width,
      viewportSize.height,
      targetScale
    );
    animateCameraTo(center.scale, center.translateX, center.translateY);
    setFocusModeActive(false);
    closeMenu();
  }, [animateCameraTo, closeMenu, scale, viewportSize]);

  useEffect(() => {
    if (!focusRequestKey || connectionNodes.length === 0) return;
    const ids = focusNodeIds ?? [];
    const targets =
      ids.length > 0
        ? connectionNodes.filter((node) => ids.includes(node.id))
        : pickFocusDayNodes(connectionNodes);
    applyFocusToNodes(targets);
  }, [focusRequestKey, focusNodeIds, connectionNodes, applyFocusToNodes]);

  const handleZoomReset = useCallback(() => {
    const targetScale = defaultCameraRef.current.scale || clampZoom(
      Math.max(computeFitScale(viewportSize.width, viewportSize.height) * 1.2, DEFAULT_START_SCALE),
      minScale,
      CANVAS_ZOOM.MAX
    );
    const center = computeMapCenterTransform(
      viewportSize.width,
      viewportSize.height,
      targetScale
    );
    scale.value = center.scale;
    translateX.value = center.translateX;
    translateY.value = center.translateY;
    savedScale.value = center.scale;
    savedX.value = center.translateX;
    savedY.value = center.translateY;
    setViewCamera({ translateX: center.translateX, translateY: center.translateY, scale: center.scale });
    setCanvasScale(center.scale);
    setFocusModeActive(false);
    closeMenu();
  }, [
    closeMenu,
    minScale,
    savedScale,
    savedX,
    savedY,
    scale,
    translateX,
    translateY,
    viewportSize,
  ]);

  useEffect(() => {
    if (!detailMode) {
      closeMenu();
    }
  }, [detailMode, closeMenu]);

  useEffect(() => {
    if (activeNodeId == null) return;
    const stillVisible = displayNodes.some(
      (node) => node.id === activeNodeId && !node.isDeleted
    );
    if (!stillVisible) {
      closeMenu();
    }
  }, [activeNodeId, closeMenu, displayNodes]);

  const handleConfigureWildcard = useCallback(
    async (node: SkillNode, name: string, decayCategoria?: DecayCategoria) => {
      await onConfigureWildcard(node, name, decayCategoria);
      closeMenu();
    },
    [onConfigureWildcard, closeMenu]
  );

  const handleActivate = useCallback(
    (nodeId: number) => {
      const live =
        displayNodes.find((node) => node.id === nodeId) ??
        nodes.find((node) => node.id === nodeId);
      if (live) {
        const positioned = withDisplayPosition(normalizeTreeDisplayNode(live));
        setActiveNodeAnchor({
          nodeId,
          posX: positioned.posX,
          posY: positioned.posY,
        });
      }
      setActiveNodeId(nodeId);
    },
    [displayNodes, nodes, withDisplayPosition]
  );

  const handleMotherNodePress = useCallback(
    (node: SkillNode) => {
      const axisId = resolveRootMotherAxisId(node);
      if (!axisId) return;
      closeMenu();
      setNenMotherPanelAxis(axisId);
      setNenMotherPanelVisible(true);
    },
    [closeMenu]
  );

  const handleCloseMotherPanel = useCallback(() => {
    setNenMotherPanelVisible(false);
    setNenMotherPanelAxis(null);
  }, []);

  const requestDailyVerify = useCallback(
    (nodeId: number) => {
      const node =
        displayNodes.find((n) => n.id === nodeId) ?? nodes.find((n) => n.id === nodeId);
      if (!node || isDailyVerifiedToday(node)) return;
      closeMenu();
      setQualityPickerNodeId(nodeId);
    },
    [displayNodes, nodes, closeMenu]
  );

  const confirmDailyVerify = useCallback(
    async (calidad: CalidadSesion) => {
      if (qualityPickerNodeId == null) return;
      const nodeId = qualityPickerNodeId;
      setQualityPickerNodeId(null);
      setVerifiedOptimistic((prev) => ({
        ...prev,
        [nodeId]: new Date().toISOString(),
      }));
      setVerifiedOptimisticQuality((prev) => ({
        ...prev,
        [nodeId]: calidad,
      }));
      const ok = await onDailyVerify(nodeId, calidad);
      if (!ok) {
        setVerifiedOptimistic((prev) => {
          const next = { ...prev };
          delete next[nodeId];
          return next;
        });
        setVerifiedOptimisticQuality((prev) => {
          const next = { ...prev };
          delete next[nodeId];
          return next;
        });
      }
    },
    [qualityPickerNodeId, onDailyVerify]
  );

  const qualityPickerNode = useMemo(
    () =>
      qualityPickerNodeId != null
        ? displayNodes.find((n) => n.id === qualityPickerNodeId) ??
          nodes.find((n) => n.id === qualityPickerNodeId) ??
          null
        : null,
    [qualityPickerNodeId, displayNodes, nodes]
  );

  const qualityPickerAccent = useMemo(() => {
    if (!qualityPickerNode) return theme.primary;
    const axisId = resolveNenAxisId(qualityPickerNode, connectionNodes);
    return axisId ? NEN_PALETA[axisId].color : theme.primary;
  }, [qualityPickerNode, connectionNodes, theme.primary]);

  const handleDragStart = useCallback(
    (nodeId: number) => {
      setDraggingNodeId(nodeId);
      closeMenu();
    },
    [closeMenu]
  );

  const handleDragMove = useCallback((nodeId: number, posX: number, posY: number) => {
    setPositionOverrides((prev) => ({
      ...prev,
      [nodeId]: { posX, posY },
    }));
  }, []);

  const handleDragEnd = useCallback(
    async (nodeId: number, posX: number, posY: number) => {
      setDraggingNodeId(null);

      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const origin = { posX: node.posX, posY: node.posY };
      const valid = isPositionInNodeSector(node, connectionNodes, posX, posY);

      if (!valid) {
        setPositionOverrides((prev) => ({
          ...prev,
          [nodeId]: origin,
        }));
        setInvalidDropTicks((prev) => ({ ...prev, [nodeId]: Date.now() }));
        return;
      }

      setPositionOverrides((prev) => ({
        ...prev,
        [nodeId]: { posX, posY },
      }));

      if (nodeId <= 0) return;

      try {
        await updateNodePosition(nodeId, posX, posY);
        await onPersistPosition?.();
      } catch {
        setPositionOverrides((prev) => {
          const { [nodeId]: _removed, ...rest } = prev;
          return rest;
        });
      }
    },
    [connectionNodes, nodes, onPersistPosition]
  );

  useEffect(() => {
    setPositionOverrides((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const [idStr, override] of Object.entries(prev)) {
        const id = Number(idStr);
        const node = nodes.find((n) => n.id === id);
        if (
          node &&
          Math.abs(node.posX - override.posX) < 0.5 &&
          Math.abs(node.posY - override.posY) < 0.5
        ) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [nodes]);

  const syncCameraFromGestureEnd = useCallback(() => {
    syncViewCamera(translateX.value, translateY.value, scale.value);
  }, [scale, syncViewCamera, translateX, translateY]);

  const canvasStyle = useAnimatedStyle(() => ({
    transformOrigin: 'left top',
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const canvasPanGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!canvasMenuOpen)
        .maxPointers(1)
        .minDistance(CANVAS_PAN_MIN_DISTANCE)
        .activeOffsetX([-CANVAS_PAN_MIN_DISTANCE, CANVAS_PAN_MIN_DISTANCE])
        .activeOffsetY([-CANVAS_PAN_MIN_DISTANCE, CANVAS_PAN_MIN_DISTANCE])
        .onStart(() => {
          if (infoOpenRef.current || canvasMenuOpen) return;
          menuDismissedDuringPan.value = false;
          savedX.value = translateX.value;
          savedY.value = translateY.value;
        })
        .onUpdate((event) => {
          if (infoOpenRef.current || canvasMenuOpen) return;
          const dist = Math.hypot(event.translationX, event.translationY);
          if (dist >= PAN_DISMISS_MENU_PX && !menuDismissedDuringPan.value) {
            menuDismissedDuringPan.value = true;
            runOnJS(closeMenu)();
          }
          translateX.value = savedX.value + event.translationX;
          translateY.value = savedY.value + event.translationY;
        })
        .onEnd(() => {
          if (infoOpenRef.current || canvasMenuOpen) return;
          savedX.value = translateX.value;
          savedY.value = translateY.value;
          runOnJS(syncCameraFromGestureEnd)();
        }),
    [canvasMenuOpen, closeMenu, menuDismissedDuringPan, savedX, savedY, syncCameraFromGestureEnd, translateX, translateY]
  );

  const canvasPinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .enabled(!canvasMenuOpen)
        .onStart(() => {
          if (infoOpenRef.current || canvasMenuOpen) return;
          savedScale.value = scale.value;
        })
        .onUpdate((event) => {
          if (infoOpenRef.current || canvasMenuOpen) return;
          const next = clampZoom(
            savedScale.value * event.scale,
            minScaleSv.value,
            CANVAS_ZOOM.MAX
          );
          const t = zoomAroundPoint(
            scale.value,
            next,
            translateX.value,
            translateY.value,
            event.focalX,
            event.focalY
          );
          scale.value = next;
          translateX.value = t.x;
          translateY.value = t.y;
        })
        .onEnd(() => {
          if (infoOpenRef.current || canvasMenuOpen) return;
          savedScale.value = scale.value;
          savedX.value = translateX.value;
          savedY.value = translateY.value;
          runOnJS(syncCameraFromGestureEnd)();
        }),
    [canvasMenuOpen, minScaleSv, savedScale, savedX, savedY, scale, syncCameraFromGestureEnd, translateX, translateY]
  );

  const backgroundDismissTap = useMemo(
    () =>
      Gesture.Tap()
        .maxDistance(CANVAS_PAN_MIN_DISTANCE)
        .maxDuration(280)
        .onEnd(() => {
          if (infoOpenRef.current) return;
          runOnJS(closeMenu)();
        }),
    [closeMenu]
  );

  const canvasViewportGesture = useMemo(
    () => Gesture.Simultaneous(canvasPinchGesture, canvasPanGesture),
    [canvasPanGesture, canvasPinchGesture]
  );

  return (
    <View style={styles.root}>
      <GestureDetector gesture={canvasViewportGesture}>
        <View style={styles.viewport} onLayout={handleViewportLayout}>
          {canvasMenuOpen && !infoOpenRef.current && (
            <Pressable
              style={styles.menuDismissBackdrop}
              onPress={closeMenu}
              accessibilityLabel="Cerrar menú del nodo"
            />
          )}
          <Animated.View
            pointerEvents="box-none"
            style={[
              styles.canvas,
              { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
              canvasStyle,
            ]}
          >
            <View style={styles.backgroundLayer} pointerEvents="box-none">
              {canvasMenuOpen && !infoOpenRef.current ? (
                <GestureDetector gesture={backgroundDismissTap}>
                  <View style={styles.backgroundTapPlate} accessibilityLabel="Fondo del mapa" />
                </GestureDetector>
              ) : (
                <View style={styles.backgroundTapPlate} accessibilityLabel="Fondo del mapa" />
              )}
              <View style={styles.backgroundDecor} pointerEvents="box-none">
                <TreeSpaceBackground />
              </View>
            </View>

            <View style={styles.connectionsLayer} pointerEvents="none">
              <TreeConnections
                nodes={connectionNodes}
                theme={theme}
                user={user}
                simplified={false}
                focusNodeId={activeNodeId}
                pulseNodeIds={connectionPulse.nodeIds}
                pulseTick={connectionPulse.tick}
              />
            </View>

            <View
              style={[
                styles.shadowGuidesLayer,
                shadowLayerElevated && styles.shadowGuidesLayerActive,
              ]}
              pointerEvents="box-none"
            >
              {shadowGuides.map((node) => (
                <ShadowGuideNode
                  key={node.id}
                  node={applyActiveAnchor(node)}
                  nodes={connectionNodes}
                  theme={theme}
                  user={user}
                  isActive={node.id === activeNodeId}
                  onActivate={handleActivate}
                  onDeactivate={closeMenu}
                  onAddXp={onAddXp}
                  onDailyVerify={requestDailyVerify}
                  onAddSubSkill={onAddSubSkill}
                  onAdoptGuide={onAdoptGuide}
                  onDeleteNode={onDeleteNode}
                  onRenameNode={onRenameNode}
                  onShowInfo={handleShowInfo}
                  detailMode={detailMode}
                />
              ))}
            </View>

            <View style={styles.nodesLayer} pointerEvents="box-none">
              {lockedCatalogToRender.map((node) => (
                <LockedCatalogNode
                  key={node.id}
                  node={applyActiveAnchor(node)}
                  nodes={connectionNodes}
                  theme={theme}
                  user={user}
                  detailMode={detailMode}
                  isActive={node.id === activeNodeId}
                  canvasMenuOpen={canvasMenuOpen}
                  onActivate={handleActivate}
                  onDeactivate={closeMenu}
                  onAddXp={onAddXp}
                  onDailyVerify={requestDailyVerify}
                  onAddSubSkill={onAddSubSkill}
                  onAdoptGuide={onAdoptGuide}
                  onDeleteNode={onDeleteNode}
                  onRenameNode={onRenameNode}
                  onShowInfo={handleShowInfo}
                />
              ))}
              {foregroundNodes.map((node) => {
                const flash = xpFlashByNode[node.id];
                return (
                <CustomNode
                  key={node.id}
                  node={applyActiveAnchor(node)}
                  nodes={connectionNodes}
                  theme={theme}
                  user={user}
                  isActive={node.id === activeNodeId}
                  isDragging={draggingNodeId === node.id}
                  isDraggable={isDraggableNode(node) && detailMode && node.id !== activeNodeId}
                  onActivate={handleActivate}
                  onDeactivate={closeMenu}
                  onDragStart={handleDragStart}
                  onDragMove={handleDragMove}
                  onDragEnd={handleDragEnd}
                  onAddXp={onAddXp}
                  onDailyVerify={requestDailyVerify}
                  onAddSubSkill={onAddSubSkill}
                  onAdoptGuide={onAdoptGuide}
                  onDeleteNode={onDeleteNode}
                  onRenameNode={onRenameNode}
                  onShowInfo={handleShowInfo}
                  onMotherNodePress={handleMotherNodePress}
                  detailMode={detailMode}
                  canvasMenuOpen={canvasMenuOpen}
                  xpFlashTick={flash?.tick ?? 0}
                  xpFlashKind={flash?.kind ?? 'levelUp'}
                  invalidDropTick={invalidDropTicks[node.id] ?? 0}
                />
              );})}
            </View>

            {activeNodeForMenu && detailMode && (
              <View style={styles.menuOverlayLayer} pointerEvents="box-none">
                <CanvasNodeMenuOverlay
                  node={activeNodeForMenu}
                  nodes={connectionNodes}
                  user={user}
                  detailMode={detailMode}
                  onCloseMenu={closeMenu}
                  onAddXp={onAddXp}
                  onDailyVerify={requestDailyVerify}
                  onAddSubSkill={onAddSubSkill}
                  onAdoptGuide={onAdoptGuide}
                  onDeleteNode={onDeleteNode}
                  onRenameNode={onRenameNode}
                  onShowInfo={handleShowInfo}
                />
              </View>
            )}

            <View style={styles.nenHubLayer} pointerEvents="box-none">
              <Pressable
                style={styles.nenHub}
                onPress={() => setNenDetailOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Ver detalle del perfil Nen"
              >
                <NenRadarChart
                  profile={nenProfile}
                  size={CENTER_NEN_CHART_SIZE}
                  glowColor={theme.accent}
                  celebratingAxis={celebratingAxis}
                  celebrationTick={celebrationTick}
                  hatsuLabel={hatsu.hatsuLabel}
                  coolingAxes={nenCoolingAxes}
                />
              </Pressable>
            </View>

            {detailMode && (
              <View style={styles.labelsLayer} pointerEvents="box-none">
                {labelNodes.map((node) => {
                  const visibility = labelVisibilityMap.get(node.id);
                  if (!visibility) return null;
                  return (
                    <NodeOrbitLabel
                      key={`orbit-label-${node.id}`}
                      node={node}
                      nodes={connectionNodes}
                      theme={theme}
                      user={user}
                      visibility={visibility}
                      elevated={node.id === activeNodeId}
                      onRenameNode={onRenameNode}
                    />
                  );
                })}
              </View>
            )}

          </Animated.View>
        </View>
      </GestureDetector>

      {criticalFlashTick > 0 && (
        <CriticalFlashOverlay
          key={criticalFlashTick}
          onDone={() => setCriticalFlashTick(0)}
        />
      )}

      <ZoomControls
        theme={theme}
        scale={canvasScale}
        minScale={minScale}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleZoomReset}
      />

      <Pressable
        style={[
          styles.focusFab,
          {
            backgroundColor: focusModeActive ? theme.accent : theme.surface,
            borderColor: theme.primary,
          },
        ]}
        onPress={handleToggleFocus}
        accessibilityRole="button"
        accessibilityLabel="Centrar mapa en el hexágono Nen"
      >
        <Text style={[styles.focusFabIcon, { color: focusModeActive ? '#000' : theme.primary }]}>
          ◎
        </Text>
      </Pressable>

      <SessionQualityModal
        visible={qualityPickerNodeId != null}
        node={qualityPickerNode}
        nodes={connectionNodes}
        accentColor={qualityPickerAccent}
        onSelect={(calidad) => {
          void confirmDailyVerify(calidad);
        }}
        onCancel={() => setQualityPickerNodeId(null)}
      />

      <NodeInfoModal
        visible={infoNodeId != null}
        node={infoNode}
        nodes={connectionNodes}
        theme={theme}
        onClose={handleCloseInfo}
        onDeleteNode={onDeleteNode}
        onConfigureWildcard={handleConfigureWildcard}
      />

      <NenHexagonDetailPanel
        visible={nenDetailOpen}
        insights={nenDecayInsights}
        theme={theme}
        onClose={() => setNenDetailOpen(false)}
      />

      <NenMotherPanel
        nenAxisId={nenMotherPanelAxis}
        visible={nenMotherPanelVisible}
        nodes={connectionNodes}
        nenProfile={nenProfile}
        onClose={handleCloseMotherPanel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SPACE_BG,
    overflow: 'hidden',
  },
  menuDismissBackdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  criticalFlash: {
    backgroundColor: '#3ecf6e',
    zIndex: 9999,
  },
  viewport: {
    flex: 1,
    overflow: 'hidden',
  },
  canvas: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'visible',
    zIndex: 2,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  },
  backgroundTapPlate: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
  },
  backgroundDecor: {
    ...StyleSheet.absoluteFill,
  },
  nenHub: {
    position: 'absolute',
    left: CENTER_NEN_OFFSET,
    top: CENTER_NEN_OFFSET,
    width: CENTER_NEN_SIZE,
    height: CENTER_NEN_SIZE,
  },
  connectionsLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 15,
    overflow: 'visible',
  },
  shadowGuidesLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
    overflow: 'visible',
  },
  shadowGuidesLayerActive: {
    zIndex: 150,
  },
  nodesLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    overflow: 'visible',
  },
  labelsLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 110,
    overflow: 'visible',
  },
  menuOverlayLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 999,
    overflow: 'visible',
  },
  nenHubLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    overflow: 'visible',
  },
  focusFab: {
    position: 'absolute',
    bottom: 88,
    right: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
  },
  focusFabIcon: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
  },
});
