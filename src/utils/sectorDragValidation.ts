import { SkillNode } from '@/src/types';
import { isDraggableNode } from '@/src/utils/nodeMenuPolicy';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  ORB_SIZE,
} from '@/src/utils/treeLayout';

/** Permite colocar nodos arrastrables en cualquier punto válido del lienzo. */
export function isPositionInNodeSector(
  node: SkillNode,
  _allNodes: SkillNode[],
  posX: number,
  posY: number
): boolean {
  if (!isDraggableNode(node)) return true;

  const margin = 0;
  return (
    posX >= margin &&
    posY >= margin &&
    posX <= CANVAS_WIDTH - ORB_SIZE - margin &&
    posY <= CANVAS_HEIGHT - ORB_SIZE - margin
  );
}
