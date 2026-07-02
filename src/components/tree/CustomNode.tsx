import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { AppTheme, SkillNode, User } from '@/src/types';
import { useNenHatsu } from '@/src/context/NenHatsuContext';
import { computeDecayRatio } from '@/src/utils/decayRatio';
import { isDailyVerifiedToday } from '@/src/utils/dailyVerification';
import { sessionQualityIcon } from '@/src/utils/sessionQuality';
import { getNodeVisualIntensity } from '@/src/utils/nodeIntensity';
import { getDecayState, isVisualDecayTrackedNode } from '@/src/utils/visualDecay';
import { getNodeMenuCapabilities } from '@/src/utils/nodeMenuPolicy';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  clamp,
  getRuneIcon,
  isNodeUnlocked,
  ORB_SIZE,
} from '@/src/utils/treeLayout';

import { buildNodeMenuActions } from './buildNodeMenuActions';
import { MENU_CONTAINER_WIDTH } from './nodeLabelLayout';
import { NodeRadialMenu, MENU_ROW_HEIGHT } from './NodeRadialMenu';
import { ORB_VISUAL_SIZE, OrbVisual } from './OrbVisual';
import type { XpFeedbackEventType } from '@/src/utils/xpFeedback';

interface CustomNodeProps {
  node: SkillNode;
  nodes: SkillNode[];
  theme: AppTheme;
  user: User | null;
  isActive: boolean;
  isDragging: boolean;
  isDraggable: boolean;
  onActivate: (nodeId: number) => void;
  onDeactivate: () => void;
  onDragStart: (nodeId: number) => void;
  onDragMove: (nodeId: number, posX: number, posY: number) => void;
  onDragEnd: (nodeId: number, posX: number, posY: number) => void;
  onAddXp: (nodeId: number) => void;
  onDailyVerify: (nodeId: number) => void;
  onAddSubSkill: (parent: SkillNode) => void;
  onAdoptGuide: (guide: SkillNode) => void;
  onDeleteNode: (node: SkillNode) => void;
  onShowInfo: (node: SkillNode) => void;
  onMotherNodePress?: (node: SkillNode) => void;
  /** false = vista lejana (sin etiquetas ni detalle SVG). */
  detailMode: boolean;
  /** Hay un menú radial abierto en el lienzo (atenúa etiquetas ajenas). */
  canvasMenuOpen?: boolean;
  /** Menú renderizado fuera del GestureDetector (TreeCanvas overlay). */
  hideRadialMenu?: boolean;
  xpFlashTick?: number;
  xpFlashKind?: XpFeedbackEventType;
  invalidDropTick?: number;
}

const ORB_OFFSET = (ORB_VISUAL_SIZE - ORB_SIZE) / 2;
const MENU_GAP_ABOVE_ORB = 6;
const MENU_STACK_HEIGHT = MENU_ROW_HEIGHT + MENU_GAP_ABOVE_ORB;
const DRAG_ACTIVATION = 8;
const LONG_PRESS_MS = 500;
const SCROLL_CANCEL_PX = 10;
const IS_NATIVE = Platform.OS !== 'web';
const IS_WEB = Platform.OS === 'web';

function clampNodePosition(posX: number, posY: number) {
  return {
    posX: clamp(posX, 0, CANVAS_WIDTH - ORB_SIZE),
    posY: clamp(posY, 0, CANVAS_HEIGHT - ORB_SIZE),
  };
}

export function CustomNode({
  node,
  nodes,
  theme,
  user,
  isActive,
  isDragging,
  isDraggable,
  onActivate,
  onDeactivate,
  onDragStart,
  onDragMove,
  onDragEnd,
  onAddXp,
  onDailyVerify,
  onAddSubSkill,
  onAdoptGuide,
  onDeleteNode,
  onShowInfo,
  onMotherNodePress,
  detailMode,
  canvasMenuOpen = false,
  hideRadialMenu = false,
  xpFlashTick = 0,
  xpFlashKind = 'levelUp',
  invalidDropTick = 0,
}: CustomNodeProps) {
  const caps = getNodeMenuCapabilities(node);
  const isRoot = caps.isRoot;
  const unlocked = isNodeUnlocked(node);
  const hatsu = useNenHatsu();
  const dragOrigin = useRef({ posX: node.posX, posY: node.posY });
  const grabbedSv = useSharedValue(false);
  const orbScaleSv = useSharedValue(1);
  const shakeSv = useSharedValue(0);
  const [grabAuraTick, setGrabAuraTick] = useState(0);

  const visualNode = node;

  const { palette, routineState } = useMemo(
    () => getNodeVisualIntensity(visualNode, nodes, user),
    [visualNode, nodes, user]
  );
  const routineActive = routineState === 'active';

  const decayRatio = useMemo(() => {
    if (!user || isRoot) return 1;
    return computeDecayRatio(visualNode, user);
  }, [visualNode, user, isRoot]);

  const isFreshAura = useMemo(() => {
    if (!isVisualDecayTrackedNode(visualNode)) return false;
    return getDecayState(visualNode) === 'fresh';
  }, [visualNode]);

  const { border: borderColor, glow: glowColor, accentSecondary } = palette;
  const rune = getRuneIcon(node);

  const handleOrbPress = useCallback(() => {
    if (isRoot && onMotherNodePress) {
      onMotherNodePress(node);
      return;
    }
    if (isActive) {
      onDeactivate();
    } else {
      onActivate(node.id);
    }
  }, [isActive, isRoot, node, onActivate, onDeactivate, onMotherNodePress]);

  const syncDragOrigin = useCallback(() => {
    dragOrigin.current = { posX: node.posX, posY: node.posY };
  }, [node.posX, node.posY]);

  const handleDragStart = useCallback(() => {
    syncDragOrigin();
    onDeactivate();
    onDragStart(node.id);
  }, [node.id, onDeactivate, onDragStart, syncDragOrigin]);

  const handleDragUpdate = useCallback(
    (translationX: number, translationY: number) => {
      const next = clampNodePosition(
        dragOrigin.current.posX + translationX,
        dragOrigin.current.posY + translationY
      );
      onDragMove(node.id, next.posX, next.posY);
    },
    [node.id, onDragMove]
  );

  const handleDragEnd = useCallback(
    (translationX: number, translationY: number) => {
      grabbedSv.value = false;
      orbScaleSv.value = withTiming(1, { duration: 140 });
      const next = clampNodePosition(
        dragOrigin.current.posX + translationX,
        dragOrigin.current.posY + translationY
      );
      onDragEnd(node.id, next.posX, next.posY);
    },
    [node.id, onDragEnd, grabbedSv, orbScaleSv]
  );

  useEffect(() => {
    if (!invalidDropTick) return;
    shakeSv.value = withSequence(
      withTiming(-6, { duration: 45 }),
      withTiming(6, { duration: 45 }),
      withTiming(-4, { duration: 45 }),
      withTiming(0, { duration: 45 })
    );
  }, [invalidDropTick, shakeSv]);

  const orbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: orbScaleSv.value }, { translateX: shakeSv.value }],
  }));

  const enterGrabMode = useCallback(() => {
    setGrabAuraTick(Date.now());
    orbScaleSv.value = withTiming(1.1, { duration: 160 });
  }, [orbScaleSv]);

  const exitGrabMode = useCallback(() => {
    grabbedSv.value = false;
    orbScaleSv.value = withTiming(1, { duration: 140 });
  }, [grabbedSv, orbScaleSv]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(isDraggable && !IS_NATIVE)
        .activeOffsetX([-DRAG_ACTIVATION, DRAG_ACTIVATION])
        .activeOffsetY([-DRAG_ACTIVATION, DRAG_ACTIVATION])
        .onStart(() => {
          runOnJS(syncDragOrigin)();
          runOnJS(handleDragStart)();
        })
        .onUpdate((event) => {
          runOnJS(handleDragUpdate)(event.translationX, event.translationY);
        })
        .onEnd((event) => {
          runOnJS(handleDragEnd)(event.translationX, event.translationY);
        }),
    [isDraggable, syncDragOrigin, handleDragStart, handleDragUpdate, handleDragEnd]
  );

  const longPressGesture = useMemo(
    () =>
      Gesture.LongPress()
        .enabled(isDraggable && IS_NATIVE)
        .minDuration(LONG_PRESS_MS)
        .maxDistance(SCROLL_CANCEL_PX)
        .onStart(() => {
          grabbedSv.value = true;
          runOnJS(syncDragOrigin)();
          runOnJS(enterGrabMode)();
          runOnJS(handleDragStart)();
        }),
    [isDraggable, syncDragOrigin, enterGrabMode, handleDragStart, grabbedSv]
  );

  const mobileDragGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(isDraggable && IS_NATIVE)
        .manualActivation(true)
        .onTouchesMove((_event, state) => {
          if (grabbedSv.value) {
            state.activate();
          } else {
            state.fail();
          }
        })
        .onUpdate((event) => {
          runOnJS(handleDragUpdate)(event.translationX, event.translationY);
        })
        .onEnd((event) => {
          runOnJS(handleDragEnd)(event.translationX, event.translationY);
          runOnJS(exitGrabMode)();
        })
        .onFinalize(() => {
          runOnJS(exitGrabMode)();
        }),
    [isDraggable, handleDragUpdate, handleDragEnd, exitGrabMode, grabbedSv]
  );

  const tapGesture = useMemo(
    () =>
      Gesture.Tap().onEnd(() => {
        runOnJS(handleOrbPress)();
      }),
    [handleOrbPress]
  );

  const orbGesture = useMemo(
    () =>
      Gesture.Exclusive(
        tapGesture,
        IS_NATIVE
          ? Gesture.Simultaneous(longPressGesture, mobileDragGesture)
          : panGesture
      ),
    [longPressGesture, mobileDragGesture, panGesture, tapGesture]
  );

  const tieneCheckHoy = isDailyVerifiedToday(visualNode);
  const sessionQuality = visualNode.sessionQuality;

  const orbBody = (
    <Animated.View style={[styles.orbHitArea, orbAnimatedStyle]} collapsable={false}>
      <OrbVisual
        rune={rune}
        borderColor={borderColor}
        glowColor={glowColor}
        accentSecondary={accentSecondary}
        isActive={isActive || isDragging}
        isGuide={false}
        isWildcard={caps.isWildcard}
        routineIntensity={routineState}
        unlocked={unlocked}
        decayRatio={decayRatio}
        simplified={!detailMode}
        xpFlashTick={grabAuraTick || xpFlashTick}
        xpFlashKind={xpFlashKind}
        hatsuAuraColor={isFreshAura ? hatsu.auraColor : undefined}
        destelloPattern={hatsu.destelloPattern}
        auraPulseMs={isFreshAura ? hatsu.pulseMs : undefined}
        coreFill={isRoot ? '#0D0D1A' : undefined}
      />
      {tieneCheckHoy ? (
        <View
          style={[styles.qualityBadge, { borderColor: borderColor }]}
          pointerEvents="none"
        >
          <Text style={styles.qualityIcon}>
            {sessionQualityIcon(sessionQuality ?? 'completa')}
          </Text>
        </View>
      ) : null}
      {detailMode && node.level > 1 && (
        <View
          style={[styles.levelDot, { backgroundColor: borderColor }]}
          pointerEvents="none"
        >
          <Text style={styles.levelText}>{node.level}</Text>
        </View>
      )}
    </Animated.View>
  );

  const handleDailyVerify = useCallback(async () => {
    if (isDailyVerifiedToday(node)) return;
    onDailyVerify(node.id);
  }, [node, onDailyVerify]);

  const handleAddXp = useCallback(async () => {
    await onAddXp(node.id);
  }, [node.id, onAddXp]);

  const handleShowInfo = useCallback(() => {
    requestAnimationFrame(() => {
      onShowInfo(node);
    });
  }, [node, onShowInfo]);

  const menuActions = useMemo(
    () =>
      hideRadialMenu
        ? []
        : buildNodeMenuActions(node, nodes, {
            onAdoptGuide,
            onAddSubSkill,
            onAddXp: () => {
              void handleAddXp();
            },
            onDailyVerify: () => {
              void handleDailyVerify();
            },
            onShowInfo: handleShowInfo,
            onDeleteNode,
            onCloseMenu: onDeactivate,
          }),
    [
      hideRadialMenu,
      node,
      nodes,
      onAdoptGuide,
      onAddSubSkill,
      handleAddXp,
      handleDailyVerify,
      handleShowInfo,
      onDeleteNode,
      onDeactivate,
    ]
  );

  const showMenu =
    !hideRadialMenu && detailMode && isActive && !isDragging && menuActions.length > 0;
  const isMenuSelected = (canvasMenuOpen && isActive && !isDragging) || showMenu;
  const stackReservedHeight = showMenu ? MENU_STACK_HEIGHT : 0;

  /** Raíces Nen: hit area compacta — el contenedor de 240px se solapaba con vecinos (~220px entre centros). */
  const touchWidth = isRoot ? ORB_VISUAL_SIZE : MENU_CONTAINER_WIDTH;
  const touchLeft = node.posX + ORB_SIZE / 2 - touchWidth / 2;

  const stackZIndex = caps.isRoot ? 80 : caps.isWildcard ? 40 : 55;

  return (
    <View
      pointerEvents={detailMode ? 'box-none' : 'none'}
      style={[
        styles.wrapper,
        isRoot ? styles.wrapperCompact : null,
        {
          left: touchLeft,
          width: touchWidth,
          top: node.posY - ORB_OFFSET - stackReservedHeight,
          paddingTop: stackReservedHeight,
          zIndex: isDragging ? 999 : isMenuSelected ? 998 : isActive ? 990 : stackZIndex,
        },
      ]}
      collapsable={false}
    >
      {showMenu && (
        <View style={styles.menuSlot} pointerEvents="auto">
          <NodeRadialMenu accentColor={borderColor} actions={menuActions} />
        </View>
      )}

      {IS_WEB ? (
        <Pressable
          onPress={handleOrbPress}
          accessibilityRole="button"
          accessibilityLabel={node.name}
          style={styles.orbHitArea}
        >
          {orbBody}
        </Pressable>
      ) : (
        <GestureDetector gesture={orbGesture}>{orbBody}</GestureDetector>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    width: MENU_CONTAINER_WIDTH,
    alignItems: 'center',
    overflow: 'visible',
    backgroundColor: 'transparent',
    elevation: 0,
  },
  wrapperCompact: {
    width: ORB_VISUAL_SIZE,
  },
  menuSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    alignItems: 'center',
    zIndex: 500,
  },
  orbHitArea: {
    width: ORB_VISUAL_SIZE,
    height: ORB_VISUAL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    overflow: 'hidden',
    elevation: 0,
    cursor: 'pointer',
  },
  levelDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: '#000',
  },
  levelText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '800',
  },
  qualityBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0D0D1A',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  qualityIcon: {
    fontSize: 10,
  },
});

/** Re-export para colisión compartida con force-directed layout (mapGeometry). */
export { estimateForceLayoutOrbRadius } from '@/src/utils/mapGeometry';
