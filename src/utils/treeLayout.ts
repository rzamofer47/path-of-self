import {
  MacroArea,
  NodeCenter,
  SkillNode,
  TreeEdge,
  User,
} from '@/src/types';
import { getCatalogChildSlugs, getCatalogParentSlug, getCatalogPrerequisiteSlug } from '@/src/data/skillCatalogSeeds';
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

/** Resuelve el ancestro visible más cercano según la cadena parentSlug del catálogo. */
function resolveVisibleCatalogAncestor(node: SkillNode, nodes: SkillNode[]): SkillNode | null {
  const slug = node.slug;
  if (!slug) return null;

  let cursor: string | null = getCatalogParentSlug(slug);
  const visited = new Set<string>();

  while (cursor && !visited.has(cursor)) {
    visited.add(cursor);
    const match = nodes.find((candidate) => candidate.slug === cursor);
    if (match) return match;
    cursor = getCatalogParentSlug(cursor);
  }

  return null;
}

/** Padre jerárquico: catálogo manda; parent_id solo si coincide con el seed. */
export function resolveHierarchyParent(node: SkillNode, nodes: SkillNode[]): SkillNode | null {
  const slug = node.slug;
  if (slug) {
    const expectedParentSlug = getCatalogParentSlug(slug);
    if (expectedParentSlug) {
      const bySlug = nodes.find((candidate) => candidate.slug === expectedParentSlug);
      if (bySlug) return bySlug;

      const visibleAncestor = resolveVisibleCatalogAncestor(node, nodes);
      if (visibleAncestor) return visibleAncestor;

      if (node.parentId != null) {
        const byId = nodes.find((candidate) => candidate.id === node.parentId);
        if (byId?.slug === expectedParentSlug) return byId;
      }

      return null;
    }
  }

  if (node.parentId != null) {
    const byId = nodes.find((candidate) => candidate.id === node.parentId);
    if (byId && byId.id !== node.id) return byId;
  }

  return resolveParentNode(node, nodes);
}

/** Hijos jerárquicos directos (catálogo + parent_id válido). */
export function resolveHierarchyChildren(parent: SkillNode, nodes: SkillNode[]): SkillNode[] {
  const seen = new Set<number>();
  const children: SkillNode[] = [];

  const push = (child: SkillNode | undefined) => {
    if (!child || child.isDeleted || child.id === parent.id || seen.has(child.id)) return;
    const expectedParentSlug = child.slug ? getCatalogParentSlug(child.slug) : null;
    if (expectedParentSlug && parent.slug !== expectedParentSlug) return;
    seen.add(child.id);
    children.push(child);
  };

  if (parent.slug) {
    for (const childSlug of getCatalogChildSlugs(parent.slug)) {
      push(nodes.find((candidate) => candidate.slug === childSlug));
    }
  }

  for (const candidate of nodes) {
    if (candidate.parentId !== parent.id) continue;
    const expectedParentSlug = candidate.slug ? getCatalogParentSlug(candidate.slug) : null;
    if (expectedParentSlug && parent.slug !== expectedParentSlug) continue;
    push(candidate);
  }

  return children;
}

export function computeHierarchicalEdges(nodes: SkillNode[]): TreeEdge[] {
  const visible = nodes.filter((node) => !node.isDeleted);
  const nodeIds = new Set(visible.map((n) => n.id));
  const edges: TreeEdge[] = [];
  const seen = new Set<string>();

  const addEdge = (parent: SkillNode, child: SkillNode) => {
    if (parent.id === child.id || !nodeIds.has(parent.id) || !nodeIds.has(child.id)) return;

    const key = `${parent.id}-${child.id}`;
    if (seen.has(key)) return;
    seen.add(key);

    edges.push({
      fromId: parent.id,
      toId: child.id,
      strength: Math.min(parent.level, child.level) / 10,
    });
  };

  for (const node of visible) {
    const parent = resolveHierarchyParent(node, visible);
    if (parent) addEdge(parent, node);
  }

  for (const node of visible) {
    for (const child of resolveHierarchyChildren(node, visible)) {
      addEdge(node, child);
    }
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

/** Prerequisito de catálogo cumplido (XP > 0 en el nodo anterior de la cadena). */
export function isCatalogPrerequisiteMet(node: SkillNode, nodes: SkillNode[]): boolean {
  if (node.layer !== 'locked') return true;
  const prereqSlug = getCatalogPrerequisiteSlug(node.slug ?? '');
  if (!prereqSlug) return true;
  const prereq = nodes.find((candidate) => candidate.slug === prereqSlug);
  if (!prereq) return true;
  return prereq.xp > 0;
}

/** Nodo desbloqueado: raíces siempre; custom tras práctica, XP o check de hoy. */
export function isNodeUnlocked(node: SkillNode): boolean {
  if (isRootLayer(node) || isWildcardNode(node)) return true;
  return node.xp > 0 || node.lastPracticeAt !== null || isDailyVerifiedToday(node);
}

/** Catálogo locked accesible en el canvas (prerequisito + no bloqueado por progresión). */
export function isCatalogNodeAccessible(node: SkillNode, nodes: SkillNode[]): boolean {
  if (node.layer !== 'locked') return true;
  return isCatalogPrerequisiteMet(node, nodes);
}
