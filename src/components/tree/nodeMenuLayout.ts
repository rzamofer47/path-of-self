import { SkillNode } from '@/src/types';
import { ORB_SIZE } from '@/src/utils/treeLayout';

import { MENU_CONTAINER_WIDTH } from './nodeLabelLayout';
import { MENU_ROW_HEIGHT } from './NodeRadialMenu';
import { ORB_VISUAL_SIZE } from './OrbVisual';

export const ORB_OFFSET = (ORB_VISUAL_SIZE - ORB_SIZE) / 2;
export const MENU_GAP_ABOVE_ORB = 6;
export const MENU_STACK_HEIGHT = MENU_ROW_HEIGHT + MENU_GAP_ABOVE_ORB;

/** Posición del menú radial en coordenadas del lienzo (sin transform viewport). */
export function getNodeMenuOverlayStyle(node: Pick<SkillNode, 'posX' | 'posY'>) {
  return {
    position: 'absolute' as const,
    left: node.posX + ORB_SIZE / 2 - MENU_CONTAINER_WIDTH / 2,
    top: node.posY - ORB_OFFSET - MENU_STACK_HEIGHT,
    width: MENU_CONTAINER_WIDTH,
    height: MENU_ROW_HEIGHT,
    zIndex: 1000,
  };
}
