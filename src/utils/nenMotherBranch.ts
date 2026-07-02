import { NenAxisId, resolveNenAxisId } from '@/src/config/nenConfig';
import { DECAY_CATEGORIAS } from '@/src/config/nenDecayConfig';
import { resolveDecayCategoria } from '@/src/utils/resolveNenDecayCategory';
import { SkillNode } from '@/src/types';

export type NenEjeEstado = 'Estable' | 'Enfriando' | 'En decay';

const MS_PER_DAY = 86400000;

/** Nodos de catálogo/custom de una rama Nen (sin el núcleo madre). */
export function nodesInNenBranch(allNodes: SkillNode[], nenAxisId: NenAxisId): SkillNode[] {
  return allNodes.filter((node) => {
    if (node.isDeleted) return false;
    if (node.layer === 'root' || node.layer === 'guide') return false;
    return resolveNenAxisId(node, allNodes) === nenAxisId;
  });
}

export function calcularEstadoEje(
  allNodes: SkillNode[],
  nenAxisId: NenAxisId,
  ahora: number = Date.now()
): NenEjeEstado {
  const nodosRama = nodesInNenBranch(allNodes, nenAxisId).filter((n) => n.level >= 1);

  if (nodosRama.length === 0) return 'Estable';

  let nodosEnDecay = 0;
  let nodosEnfriando = 0;

  for (const nodo of nodosRama) {
    const config = DECAY_CATEGORIAS[resolveDecayCategoria(nodo, allNodes)];
    const ultimaPractica = nodo.dailyVerifiedAt
      ? new Date(nodo.dailyVerifiedAt).getTime()
      : new Date(nodo.createdAt).getTime();
    const diasSin = Math.floor((ahora - ultimaPractica) / MS_PER_DAY);

    if (diasSin > config.diasGracia * 2) nodosEnDecay++;
    else if (diasSin > config.diasGracia) nodosEnfriando++;
  }

  if (nodosEnDecay > 0) return 'En decay';
  if (nodosEnfriando > 0) return 'Enfriando';
  return 'Estable';
}
