import { getCatalogParentSlug } from '@/src/data/skillCatalogSeeds';
import { ROOT_SEEDS } from '@/src/database/rootSeeds';
import { resolveVertienteId } from '@/src/config/nenConfig';
import { SkillNode } from '@/src/types';
import { isDailyVerifiedToday } from '@/src/utils/dailyVerification';
import { isWildcardNode } from '@/src/utils/wildcardNodes';

import { isDormantNode, isShadowLayerNode } from './shadowNodePlacement';

const ROOT_SLUG_PREFIX = 'root_';

export interface NodeMenuCapabilities {
  isGuide: boolean;
  isRoot: boolean;
  isCustom: boolean;
  isWildcard: boolean;
  canAdoptGuide: boolean;
  canAddSubSkill: boolean;
  canAddXp: boolean;
  canDailyVerify: boolean;
  canShowInfo: boolean;
  canDelete: boolean;
  canRename: boolean;
}

/** Nodo raíz madre (persistido), incluye legacy con layer incorrecto en BD. */
export function isRootNode(node: SkillNode): boolean {
  if (node.id <= 0) return false;
  if (typeof node.slug === 'string' && node.slug.startsWith(ROOT_SLUG_PREFIX)) return true;
  if (node.layer === 'root') return true;
  return ROOT_SEEDS.some(
    (seed) => seed.macroArea === node.macroArea && seed.name === node.name
  );
}

/** Guía virtual sugerida (no persistida, id negativo). */
export function isVirtualGuideNode(node: SkillNode): boolean {
  if (node.id < 0) return true;
  if (node.layer === 'guide' && !isRootNode(node)) return true;
  return false;
}

export { isDormantNode, isShadowLayerNode } from './shadowNodePlacement';

export function normalizeNodeLayer(
  node: Pick<SkillNode, 'layer' | 'slug' | 'id' | 'name' | 'macroArea'>
): SkillNode['layer'] {
  if (node.id < 0) return 'guide';
  if (typeof node.slug === 'string' && node.slug.startsWith(ROOT_SLUG_PREFIX)) return 'root';
  if (
    ROOT_SEEDS.some(
      (seed) => seed.macroArea === node.macroArea && seed.name === node.name
    )
  ) {
    return 'root';
  }
  if (
    node.layer === 'root' ||
    node.layer === 'custom' ||
    node.layer === 'guide' ||
    node.layer === 'dormant' ||
    node.layer === 'wildcard' ||
    node.layer === 'locked'
  ) {
    return node.layer;
  }
  return 'custom';
}

/** Arrastrable: solo nodos custom activos en superficie (no raíz ni sombra). */
export function isDraggableNode(node: SkillNode): boolean {
  if (isRootNode(node)) return false;
  if (isWildcardNode(node)) return false;
  if (isShadowLayerNode(node)) return false;
  return true;
}

/** Catálogo bloqueado ya practicado debe mostrarse como custom (evita menú que crece tras refresh). */
export function shouldPresentLockedAsCustom(node: SkillNode): boolean {
  if (node.layer !== 'locked') return false;
  return node.xp > 0 || node.lastPracticeAt != null || isDailyVerifiedToday(node);
}

export function normalizeTreeDisplayNode(node: SkillNode): SkillNode {
  if (!shouldPresentLockedAsCustom(node)) return node;
  return { ...node, layer: 'custom' };
}

/** Enviar al inframundo: nodos activos persistidos (no raíz ni sombra). */
export function isDeletableNode(node: SkillNode): boolean {
  if (node.isDeleted) return false;
  if (node.id <= 0 || isRootNode(node) || isDormantNode(node)) return false;
  return true;
}

/** Renombrar: nodos persistidos en superficie (no raíz ni sombra). */
export function isRenamableNode(node: SkillNode): boolean {
  if (node.id <= 0 || node.isDeleted) return false;
  if (isRootNode(node)) return false;
  if (node.layer === 'guide' || node.layer === 'dormant') return false;
  return (
    node.layer === 'custom' ||
    node.layer === 'wildcard' ||
    node.layer === 'locked'
  );
}

export function getNodeMenuCapabilities(node: SkillNode): NodeMenuCapabilities {
  const isRoot = isRootNode(node);
  const isDormant = isDormantNode(node);
  const isGuide = isShadowLayerNode(node);
  const isWildcard = isWildcardNode(node);
  const isCustom = !isRoot && !isGuide && !isWildcard;
  const isVirtualGuide = isVirtualGuideNode(node);
  const isPersisted =
    node.id > 0 && !node.isDeleted && !isDormant;

  return {
    isGuide,
    isRoot,
    isCustom,
    isWildcard,
    canAdoptGuide: isVirtualGuide || isDormant,
    canAddSubSkill: isPersisted,
    canAddXp: false,
    canDailyVerify: isPersisted && !isRoot && !isGuide,
    canShowInfo: isPersisted || isVirtualGuide,
    canDelete: isPersisted && !isRoot,
    canRename: isPersisted && !isRoot && !isGuide,
  };
}

/** Oculta hub discipline_* del catálogo si ya hay comodín/custom en la misma vertiente. */
function isCatalogDescendantOf(childSlug: string, ancestorSlug: string): boolean {
  let cursor: string | null = getCatalogParentSlug(childSlug);
  const visited = new Set<string>();

  while (cursor && !visited.has(cursor)) {
    visited.add(cursor);
    if (cursor === ancestorSlug) return true;
    cursor = getCatalogParentSlug(cursor);
  }

  return false;
}

export function shouldHideDuplicateDisciplineHub(
  node: SkillNode,
  allNodes: SkillNode[]
): boolean {
  if (node.isDeleted || node.layer !== 'locked') return false;
  const slug = node.slug ?? '';
  if (!slug.startsWith('discipline_')) return false;

  const vertiente = resolveVertienteId(node, allNodes);
  if (!vertiente) return false;

  return allNodes.some((other) => {
    if (other.id === node.id || other.isDeleted) return false;
    if (other.layer !== 'custom' && other.layer !== 'wildcard') return false;
    if (other.macroArea !== node.macroArea) return false;
    if (resolveVertienteId(other, allNodes) !== vertiente) return false;
    if (other.slug && isCatalogDescendantOf(other.slug, slug)) return false;
    return true;
  });
}

/** Oculta nodo locked duplicado cuando ya existe custom con el mismo slug. */
export function shouldHideDuplicateLockedSlug(
  node: SkillNode,
  allNodes: SkillNode[]
): boolean {
  if (node.isDeleted || node.layer !== 'locked' || !node.slug) return false;
  return allNodes.some(
    (other) =>
      other.id !== node.id &&
      !other.isDeleted &&
      other.layer === 'custom' &&
      other.slug === node.slug
  );
}

export function dedupeVisibleTreeNodes(nodes: SkillNode[]): SkillNode[] {
  return nodes.filter(
    (node) =>
      !shouldHideDuplicateDisciplineHub(node, nodes) &&
      !shouldHideDuplicateLockedSlug(node, nodes)
  );
}
