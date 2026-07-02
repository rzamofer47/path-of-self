import { SkillNode } from '@/src/types';
import { getNodeCenter } from '@/src/utils/treeLayout';

/** Distancia mínima entre centros de etiqueta en el lienzo (px). */
export const LABEL_COLLISION_RADIUS = 72;

/** Opacidad cuando hay un menú abierto y este nodo no es el activo. */
export const LABEL_OPACITY_DIMMED_MENU = 0.3;

/** Opacidad por defecto sin selección — zona con espacio. */
export const LABEL_OPACITY_DEFAULT = 0.68;

/** Opacidad por defecto sin selección — etiqueta oculta por colisión. */
export const LABEL_OPACITY_COLLIDED = 0.16;

export interface LabelVisibility {
  opacity: number;
  prominent: boolean;
}

function labelAnchor(node: SkillNode): { x: number; y: number } {
  const center = getNodeCenter(node);
  return { x: center.x, y: center.y + 34 };
}

function nodeLabelPriority(node: SkillNode): number {
  let score = node.level * 100;
  if (node.layer === 'root') score += 500;
  if (node.layer === 'custom') score += 80;
  if (node.xp > 0) score += 40;
  return score;
}

/**
 * Calcula opacidad de etiquetas:
 * - Menú abierto → activo 100%, resto 30%.
 * - Sin selección → colisión por distancia; ganador legible, perdedores tenues.
 */
export function computeLabelVisibilityMap(
  nodes: SkillNode[],
  activeNodeId: number | null,
  detailMode: boolean
): Map<number, LabelVisibility> {
  const result = new Map<number, LabelVisibility>();
  if (!detailMode) return result;

  const candidates = nodes.filter(
    (node) =>
      node.layer !== 'dormant' &&
      node.id > 0 &&
      node.layer !== 'wildcard'
  );

  if (activeNodeId != null) {
    for (const node of candidates) {
      result.set(node.id, {
        opacity: node.id === activeNodeId ? 1 : LABEL_OPACITY_DIMMED_MENU,
        prominent: node.id === activeNodeId,
      });
    }
    return result;
  }

  const sorted = [...candidates].sort((a, b) => {
    const diff = nodeLabelPriority(b) - nodeLabelPriority(a);
    return diff !== 0 ? diff : a.id - b.id;
  });

  const placed: { x: number; y: number }[] = [];

  for (const node of sorted) {
    const anchor = labelAnchor(node);
    const collides = placed.some(
      (other) => Math.hypot(anchor.x - other.x, anchor.y - other.y) < LABEL_COLLISION_RADIUS
    );

    if (collides) {
      result.set(node.id, { opacity: LABEL_OPACITY_COLLIDED, prominent: false });
    } else {
      result.set(node.id, { opacity: LABEL_OPACITY_DEFAULT, prominent: false });
      placed.push(anchor);
    }
  }

  return result;
}
