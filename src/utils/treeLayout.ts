import {
  MacroArea,
  NodeCenter,
  SkillNode,
  TreeEdge,
  User,
} from '@/src/types';
import { isRootLayer, resolveParentNode } from '@/src/utils/nodeColors';
import { isDailyVerifiedToday } from '@/src/utils/dailyVerification';
import { isWildcardNode } from '@/src/utils/wildcardNodes';

export const ORB_SIZE = 50;
export const ORB_RADIUS = ORB_SIZE / 2;
export const CANVAS_WIDTH = 2400;
export const CANVAS_HEIGHT = 2400;
export const SPACE_BG = '#050507';
export const SPACE_CENTER = '#0d1117';

/** @deprecated Usar ORB_SIZE */
export const NODE_WIDTH = ORB_SIZE;
/** @deprecated Usar ORB_SIZE */
export const NODE_HEIGHT = ORB_SIZE;

export function getNodeCenter(node: SkillNode): NodeCenter {
  return {
    id: node.id,
    x: node.posX + ORB_RADIUS,
    y: node.posY + ORB_RADIUS,
    width: ORB_SIZE,
    height: ORB_SIZE,
  };
}

/** Recorta el segmento al borde del orbe para que el hilo no quede oculto bajo el nodo. */
export function getConnectionEndpoints(
  from: NodeCenter,
  to: NodeCenter,
  inset = ORB_RADIUS + 3
): { x1: number; y1: number; x2: number; y2: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= inset * 2) {
    return { x1: from.x, y1: from.y, x2: to.x, y2: to.y };
  }
  const ux = dx / dist;
  const uy = dy / dist;
  return {
    x1: from.x + ux * inset,
    y1: from.y + uy * inset,
    x2: to.x - ux * inset,
    y2: to.y - uy * inset,
  };
}

export function computeHierarchicalEdges(nodes: SkillNode[]): TreeEdge[] {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges: TreeEdge[] = [];
  const seen = new Set<string>();

  for (const node of nodes) {
    const parent = resolveParentNode(node, nodes);
    if (!parent || parent.id === node.id) continue;
    if (!nodeIds.has(parent.id)) continue;

    const key = `${parent.id}-${node.id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    edges.push({
      fromId: parent.id,
      toId: node.id,
      strength: Math.min(parent.level, node.level) / 10,
    });
  }

  return edges;
}

/** @deprecated Usar computeHierarchicalEdges */
export function computeTreeEdges(nodes: SkillNode[]): TreeEdge[] {
  return computeHierarchicalEdges(nodes);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export { getConnectionGradientStops, getNodeOrbPalette, getOrbBorderColor } from './nodeColors';

export function getRuneIcon(node: SkillNode): string {
  if (isWildcardNode(node)) return '◇';
  if (isRootLayer(node)) {
    const icons: Record<MacroArea, string> = {
      intellectual: '✦',
      mental_emotional: '☽',
      physical: '⚔',
      productive: '⧖',
    };
    return icons[node.macroArea];
  }
  return node.name.charAt(0).toUpperCase();
}

/** Nodo desbloqueado: raíces siempre; custom tras práctica, XP o check de hoy. */
export function isNodeUnlocked(node: SkillNode): boolean {
  if (isRootLayer(node) || isWildcardNode(node)) return true;
  return node.xp > 0 || node.lastPracticeAt !== null || isDailyVerifiedToday(node);
}
