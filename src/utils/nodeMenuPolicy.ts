import { ROOT_SEEDS } from '@/src/database/rootSeeds';
import { SkillNode } from '@/src/types';
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

/** Enviar al inframundo: nodos activos persistidos (no raíz ni sombra). */
export function isDeletableNode(node: SkillNode): boolean {
  if (node.isDeleted) return false;
  return node.id > 0 && !isRootNode(node) && !isDormantNode(node);
}

/** Renombrar: nodos custom o wildcard forjados (no raíz, catálogo ni sombra). */
export function isRenamableNode(node: SkillNode): boolean {
  if (node.id <= 0 || node.isDeleted) return false;
  if (isRootNode(node)) return false;
  if (node.layer === 'locked' || node.layer === 'guide' || node.layer === 'dormant') return false;
  return node.layer === 'custom' || node.layer === 'wildcard';
}

export function getNodeMenuCapabilities(node: SkillNode): NodeMenuCapabilities {
  const isRoot = isRootNode(node);
  const isDormant = isDormantNode(node);
  const isGuide = isShadowLayerNode(node);
  const isWildcard = isWildcardNode(node);
  const isCustom = !isRoot && !isGuide && !isWildcard;
  const isLocked = node.layer === 'locked';

  return {
    isGuide,
    isRoot,
    isCustom,
    isWildcard,
    canAdoptGuide: isVirtualGuideNode(node) || isDormant,
    canAddSubSkill: (isCustom || isWildcard) && !isDormant,
    canAddXp: isCustom && !isDormant && !isLocked,
    canDailyVerify: node.id > 0 && isCustom && !isDormant,
    canShowInfo: !isRoot,
    canDelete: isDeletableNode(node),
    canRename: isRenamableNode(node),
  };
}
