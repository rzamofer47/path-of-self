import { SkillNode } from '@/src/types';
import { ORB_SIZE } from '@/src/utils/treeLayout';

import { MENU_PAW_SIZE } from './NodeRadialMenu';

/** Posición del menú radial centrado en el orbe (pata de conejo alrededor del nodo). */
export function getNodeMenuOverlayStyle(node: Pick<SkillNode, 'posX' | 'posY'>) {
  const orbCenterX = node.posX + ORB_SIZE / 2;
  const orbCenterY = node.posY + ORB_SIZE / 2;

  return {
    position: 'absolute' as const,
    left: orbCenterX - MENU_PAW_SIZE / 2,
    top: orbCenterY - MENU_PAW_SIZE / 2,
    width: MENU_PAW_SIZE,
    height: MENU_PAW_SIZE,
    zIndex: 1002,
  };
}
