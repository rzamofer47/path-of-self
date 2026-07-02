import { Fragment, useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  FeGaussianBlur,
  Filter,
  Path,
} from 'react-native-svg';

import { AppTheme, SkillNode, TreeEdge, User } from '@/src/types';
import { NEN_PALETA, resolveNenAxisId } from '@/src/config/nenConfig';
import { getMacroAreaPalette, isRootLayer } from '@/src/utils/nodeColors';
import {
  getNodeVisualIntensity,
  isNodeActiveInRoutine,
} from '@/src/utils/nodeIntensity';
import { isWildcardNode } from '@/src/utils/wildcardNodes';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  computeHierarchicalEdges,
  getConnectionEndpoints,
  getNodeCenter,
} from '@/src/utils/treeLayout';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Camino activo (PoE): ambos extremos en rutina. */
const STROKE_ACTIVE_PATH = 3.5;
const STROKE_HIGHLIGHTED_PATH = 2.2;
const STROKE_MUTED_PATH = 1;
const COLOR_MUTED = '#2c3038';
const OPACITY_MUTED = 0.42;
const OPACITY_HIGHLIGHTED = 0.72;

/** Neblina de guerra: red masiva del catálogo bloqueado. */
const COLOR_FOG = '#323842';
const FOG_OPACITY = 0.14;
const FOG_OPACITY_SIMPLIFIED = 0.26;
const FOG_STROKE_WIDTH = 0.7;
const FOG_STROKE_WIDTH_SIMPLIFIED = 0.95;

const OPACITY_ACTIVE = 0.96;
const GLOW_STROKE = 7;
const GLOW_OPACITY_MIN = 0.28;
const GLOW_OPACITY_MAX = 0.55;

type EdgeKind = 'fog' | 'muted' | 'highlighted' | 'active';

interface TreeConnectionsProps {
  nodes: SkillNode[];
  /** Si se omite, se derivan todas las dependencias padre→hijo de `nodes`. */
  edges?: TreeEdge[];
  theme: AppTheme;
  user: User | null;
  simplified?: boolean;
  pulseNodeIds?: number[];
  pulseTick?: number;
}

function brightPathStroke(node: SkillNode): string {
  return getMacroAreaPalette(node.macroArea, true).glow;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function strokeForEdge(
  parent: SkillNode | undefined,
  child: SkillNode | undefined,
  nodes: SkillNode[],
  kind: EdgeKind
): string {
  if (parent && isRootLayer(parent)) {
    const axis = resolveNenAxisId(parent, nodes);
    if (axis) {
      return hexToRgba(NEN_PALETA[axis].color, kind === 'muted' ? 0.35 : 0.6);
    }
  }
  const accentNode = child ?? parent;
  return accentNode ? brightPathStroke(accentNode) : COLOR_MUTED;
}

function isFogOfWarEdge(node: SkillNode | undefined): boolean {
  if (!node) return false;
  return node.id < 0 || node.layer === 'dormant';
}

function isEdgeOnActivePath(
  parent: SkillNode | undefined,
  child: SkillNode | undefined,
  nodes: SkillNode[],
  user: User | null
): boolean {
  if (!parent || !child || isFogOfWarEdge(parent) || isFogOfWarEdge(child)) return false;
  if (isWildcardNode(parent) || isWildcardNode(child)) return false;
  return (
    isNodeActiveInRoutine(parent, nodes, user) &&
    isNodeActiveInRoutine(child, nodes, user)
  );
}

function classifyEdgeKind(
  parent: SkillNode | undefined,
  child: SkillNode | undefined,
  nodes: SkillNode[],
  user: User | null,
  simplified: boolean
): EdgeKind {
  if (simplified) return 'fog';
  if (isEdgeOnActivePath(parent, child, nodes, user)) return 'active';
  if (
    parent &&
    child &&
    !isFogOfWarEdge(parent) &&
    !isFogOfWarEdge(child) &&
    !isWildcardNode(parent) &&
    !isWildcardNode(child) &&
    isNodeActiveInRoutine(parent, nodes, user)
  ) {
    return 'highlighted';
  }
  if (isFogOfWarEdge(parent) || isFogOfWarEdge(child)) return 'fog';
  return 'muted';
}

/** Resplandor difuso bajo el hilo activo (estilo PoE). */
function ActivePathGlow({ d, stroke }: { d: string; stroke: string }) {
  const opacity = useSharedValue(GLOW_OPACITY_MIN);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(GLOW_OPACITY_MAX, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [opacity]);

  const animatedProps = useAnimatedProps(() => ({
    strokeOpacity: opacity.value,
  }));

  return (
    <AnimatedPath
      d={d}
      stroke={stroke}
      strokeWidth={GLOW_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      filter="url(#connectionActiveGlow)"
      animatedProps={animatedProps}
    />
  );
}

function GenerationPulsePath({ d, stroke, pulseTick }: { d: string; stroke: string; pulseTick: number }) {
  const opacity = useSharedValue(0);
  const width = useSharedValue(STROKE_MUTED_PATH);

  useEffect(() => {
    opacity.value = 0;
    width.value = STROKE_MUTED_PATH;
    opacity.value = withSequence(
      withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 680, easing: Easing.in(Easing.quad) })
    );
    width.value = withSequence(
      withTiming(STROKE_ACTIVE_PATH + 2, { duration: 280, easing: Easing.out(Easing.quad) }),
      withTiming(STROKE_MUTED_PATH, { duration: 520, easing: Easing.in(Easing.quad) })
    );
  }, [pulseTick, opacity, width]);

  const animatedProps = useAnimatedProps(() => ({
    strokeOpacity: opacity.value,
    strokeWidth: width.value,
  }));

  return (
    <AnimatedPath
      d={d}
      stroke={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      animatedProps={animatedProps}
    />
  );
}

function buildConnectionPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  sameOrbit: boolean,
  orbitRadius: number,
  simplified: boolean
): string {
  if (simplified) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  if (sameOrbit) {
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;
    const startAngle = Math.atan2(y1 - centerY, x1 - centerX);
    const endAngle = Math.atan2(y2 - centerY, x2 - centerX);
    const delta = (endAngle - startAngle + 2 * Math.PI) % (2 * Math.PI);
    const sweepFlag = delta > Math.PI ? 0 : 1;
    return `M ${x1} ${y1} A ${orbitRadius} ${orbitRadius} 0 0 ${sweepFlag} ${x2} ${y2}`;
  }

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const offset = Math.min(20, len * 0.05);
  const controlX = (x1 + x2) / 2 + nx * offset;
  const controlY = (y1 + y2) / 2 + ny * offset;
  return `M ${x1} ${y1} Q ${controlX} ${controlY} ${x2} ${y2}`;
}

export function TreeConnections({
  nodes,
  edges: edgesProp,
  theme: _theme,
  user,
  simplified = false,
  pulseNodeIds = [],
  pulseTick = 0,
}: TreeConnectionsProps) {
  const pulseSet = useMemo(() => new Set(pulseNodeIds), [pulseNodeIds]);
  const hierarchyEdges = useMemo(
    () => edgesProp ?? computeHierarchicalEdges(nodes),
    [edgesProp, nodes]
  );

  const centers = useMemo(
    () => new Map(nodes.map((n) => [n.id, getNodeCenter(n)])),
    [nodes]
  );

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const edgeLayers = useMemo(() => {
    type Segment = {
      edge: TreeEdge;
      pathData: string;
      strokeColor: string;
      glowColor: string;
    };

    const fog: Segment[] = [];
    const muted: Segment[] = [];
    const highlighted: Segment[] = [];
    const active: Segment[] = [];

    for (const edge of hierarchyEdges) {
      const from = centers.get(edge.fromId);
      const to = centers.get(edge.toId);
      if (!from || !to) continue;

      const parent = nodeById.get(edge.fromId);
      const child = nodeById.get(edge.toId);
      const kind = classifyEdgeKind(parent, child, nodes, user, simplified);
      const endpoints = getConnectionEndpoints(from, to);
      const orbitCenter = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
      const fromRadius = Math.hypot(from.x - orbitCenter.x, from.y - orbitCenter.y);
      const toRadius = Math.hypot(to.x - orbitCenter.x, to.y - orbitCenter.y);
      const sameOrbit = Math.abs(fromRadius - toRadius) < 12;
      const orbitRadius = Math.max(80, (fromRadius + toRadius) / 2);
      const pathData = buildConnectionPath(
        endpoints.x1,
        endpoints.y1,
        endpoints.x2,
        endpoints.y2,
        sameOrbit,
        orbitRadius,
        simplified
      );

      const brightStroke = strokeForEdge(parent, child, nodes, kind);

      const segment: Segment = {
        edge,
        pathData,
        strokeColor:
          kind === 'active' || kind === 'highlighted' || kind === 'muted'
            ? brightStroke
            : COLOR_MUTED,
        glowColor: kind === 'active' ? brightStroke : COLOR_MUTED,
      };

      if (kind === 'fog') fog.push(segment);
      else if (kind === 'active') active.push(segment);
      else if (kind === 'highlighted') highlighted.push(segment);
      else muted.push(segment);
    }

    return { fog, muted, highlighted, active };
  }, [hierarchyEdges, centers, nodeById, nodes, user, simplified]);

  const pulseSegments = useMemo(() => {
    if (pulseTick <= 0 || pulseSet.size === 0 || simplified) return [];

    const segments: { key: string; pathData: string; stroke: string }[] = [];

    for (const edge of hierarchyEdges) {
      if (!pulseSet.has(edge.fromId) && !pulseSet.has(edge.toId)) continue;

      const from = centers.get(edge.fromId);
      const to = centers.get(edge.toId);
      if (!from || !to) continue;

      const parent = nodeById.get(edge.fromId);
      const child = nodeById.get(edge.toId);
      if (isFogOfWarEdge(parent) || isFogOfWarEdge(child)) continue;

      const endpoints = getConnectionEndpoints(from, to);
      const orbitCenter = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
      const fromRadius = Math.hypot(from.x - orbitCenter.x, from.y - orbitCenter.y);
      const toRadius = Math.hypot(to.x - orbitCenter.x, to.y - orbitCenter.y);
      const sameOrbit = Math.abs(fromRadius - toRadius) < 12;
      const orbitRadius = Math.max(80, (fromRadius + toRadius) / 2);
      const pathData = buildConnectionPath(
        endpoints.x1,
        endpoints.y1,
        endpoints.x2,
        endpoints.y2,
        sameOrbit,
        orbitRadius,
        simplified
      );

      const accentNode = child ?? parent;
      const stroke = accentNode
        ? getNodeVisualIntensity(accentNode, nodes, user).palette.glow
        : brightPathStroke(child ?? parent!);

      segments.push({
        key: `pulse-${edge.fromId}-${edge.toId}`,
        pathData,
        stroke,
      });
    }

    return segments;
  }, [pulseTick, pulseSet, simplified, hierarchyEdges, centers, nodeById, nodes, user]);

  const fogOpacity = simplified ? FOG_OPACITY_SIMPLIFIED : FOG_OPACITY;
  const fogWidth = simplified ? FOG_STROKE_WIDTH_SIMPLIFIED : FOG_STROKE_WIDTH;

  return (
    <Svg
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Defs>
        <Filter id="connectionActiveGlow" x="-60%" y="-60%" width="220%" height="220%">
          <FeGaussianBlur in="SourceGraphic" stdDeviation="4.5" />
        </Filter>
      </Defs>

      {edgeLayers.fog.map(({ edge, pathData }) => (
        <Path
          key={`fog-${edge.fromId}-${edge.toId}`}
          d={pathData}
          stroke={COLOR_FOG}
          strokeWidth={fogWidth}
          strokeOpacity={fogOpacity}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}

      {!simplified &&
        edgeLayers.muted.map(({ edge, pathData }) => (
          <Path
            key={`muted-${edge.fromId}-${edge.toId}`}
            d={pathData}
            stroke={COLOR_MUTED}
            strokeWidth={STROKE_MUTED_PATH}
            strokeOpacity={OPACITY_MUTED}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}

      {!simplified &&
        edgeLayers.highlighted.map(({ edge, pathData, strokeColor }) => (
          <Path
            key={`highlighted-${edge.fromId}-${edge.toId}`}
            d={pathData}
            stroke={strokeColor}
            strokeWidth={STROKE_HIGHLIGHTED_PATH}
            strokeOpacity={OPACITY_HIGHLIGHTED}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}

      {!simplified &&
        edgeLayers.active.map(({ edge, pathData, strokeColor, glowColor }) => (
          <Fragment key={`active-${edge.fromId}-${edge.toId}`}>
            <ActivePathGlow d={pathData} stroke={glowColor} />
            <Path
              d={pathData}
              stroke={strokeColor}
              strokeWidth={STROKE_ACTIVE_PATH}
              strokeOpacity={OPACITY_ACTIVE}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Fragment>
        ))}

      {!simplified &&
        pulseSegments.map(({ key, pathData, stroke }) => (
          <GenerationPulsePath key={key} d={pathData} stroke={stroke} pulseTick={pulseTick} />
        ))}
    </Svg>
  );
}
