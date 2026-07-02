import { GUIDE_SUGGESTIONS } from '@/src/data/guideSuggestions';
import { MacroArea, SkillNode } from '@/src/types';

import { isRootLayer } from './nodeColors';
import { computeOutwardChildPosition, nodeCenterToLogical } from './polarLayout';
import { getNodeCenter } from './treeLayout';

function isActiveCustom(node: SkillNode): boolean {
  return node.layer === 'custom';
}

/** Posición fija en la capa oscura para un nodo enviado al inframundo. */
export function resolveShadowOriginPosition(
  node: SkillNode,
  allNodes: SkillNode[]
): { posX: number; posY: number } {
  if (node.originPosX != null && node.originPosY != null) {
    return { posX: node.originPosX, posY: node.originPosY };
  }

  const roots = allNodes.filter((n) => isRootLayer(n));
  const root = roots.find((r) => r.macroArea === node.macroArea);
  if (!root) {
    return { posX: node.posX, posY: node.posY };
  }

  const activeCustom = allNodes.filter(
    (n) => isActiveCustom(n) && n.macroArea === node.macroArea && n.id !== node.id
  );

  const guideCatalog = GUIDE_SUGGESTIONS[node.macroArea];
  const guideIdx = node.slug
    ? guideCatalog.findIndex((g) => g.slug === node.slug)
    : guideCatalog.findIndex((g) => g.name.toLowerCase() === node.name.toLowerCase());

  if (guideIdx >= 0) {
    const unclaimedGuides = guideCatalog.filter(
      (g) =>
        !activeCustom.some(
          (c) =>
            c.slug === g.slug || c.name.toLowerCase() === g.name.toLowerCase()
        )
    );
    const slotIdx = unclaimedGuides.findIndex(
      (g) =>
        (node.slug && g.slug === node.slug) ||
        g.name.toLowerCase() === node.name.toLowerCase()
    );
    const childIndex = activeCustom.length + Math.max(0, slotIdx);
    const totalSiblings = activeCustom.length + unclaimedGuides.length;

    const rootCenter = getNodeCenter(root);
    const parentLog = nodeCenterToLogical(rootCenter.x, rootCenter.y);
    return computeOutwardChildPosition(
      parentLog.x,
      parentLog.y,
      childIndex,
      node.macroArea as MacroArea,
      totalSiblings,
      { depth: 1, parentIsRoot: true }
    );
  }

  return { posX: node.posX, posY: node.posY };
}

/** Nodos visibles en la capa oscura (virtuales o dormidos en BD). */
export function isShadowLayerNode(node: SkillNode): boolean {
  if (node.layer === 'dormant') return true;
  if (node.id < 0) return true;
  if (node.layer === 'guide' && !isRootLayer(node)) return true;
  return false;
}

export function isDormantNode(node: SkillNode): boolean {
  return node.layer === 'dormant';
}
