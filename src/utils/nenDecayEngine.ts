import {
  NEN_AXIS_VERTIENTES,
  NenAxisId,
  NenProfile,
  resolveVertienteId,
} from '@/src/config/nenConfig';
import { DECAY_CATEGORIAS } from '@/src/config/nenDecayConfig';
import { resolveDecayCategoria } from '@/src/utils/resolveNenDecayCategory';
import { getDecayState } from '@/src/utils/visualDecay';
import { SkillNode } from '@/src/types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const NEN_AXIS_MIN_WITH_ACTIVITY = 5;

export type NenAxisDecayStatus = 'estable' | 'enfriando' | 'en_decay';

export interface NenAxisDecayInsight {
  axisId: NenAxisId;
  value: number;
  baseValue: number;
  status: NenAxisDecayStatus;
  stalestNode: SkillNode | null;
  daysSinceActivity: number | null;
  statusLabel: string;
}

function calendarDaysSince(from: Date, to: Date): number {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY));
}

function lastActivityDate(node: SkillNode): Date {
  if (node.dailyVerifiedAt) return new Date(node.dailyVerifiedAt);
  if (node.lastPracticeAt) return new Date(node.lastPracticeAt);
  return new Date(node.createdAt);
}

function nodesForAxis(allNodes: SkillNode[], axisId: NenAxisId): SkillNode[] {
  const vertientes = NEN_AXIS_VERTIENTES[axisId];
  return allNodes.filter((node) => {
    if (node.isDeleted || node.level < 1) return false;
    const v = resolveVertienteId(node, allNodes);
    return v != null && vertientes.includes(v);
  });
}

/** Decay del valor de un eje (0–100) según inactividad de sus nodos activos. */
export function calcularValorEjeConDecay(
  valorBase: number,
  nodosDeLaVertiente: SkillNode[],
  allNodes: SkillNode[],
  ahora: Date = new Date()
): number {
  if (nodosDeLaVertiente.length === 0 || valorBase <= 0) return valorBase;

  let decayAcumulado = 0;
  let nodosContados = 0;

  for (const nodo of nodosDeLaVertiente.filter((n) => n.level >= 1 && !n.isDeleted)) {
    const categoria = DECAY_CATEGORIAS[resolveDecayCategoria(nodo, allNodes)];
    const ultimaPractica = lastActivityDate(nodo);
    const diasSinPractica = calendarDaysSince(ultimaPractica, ahora);
    const diasEnDecay = Math.max(0, diasSinPractica - categoria.diasGracia);

    if (diasEnDecay > 0) {
      const tasaDiaria = categoria.tasaSemanal / 7;
      const factorDecay = Math.pow(1 - tasaDiaria, diasEnDecay);
      decayAcumulado += 1 - factorDecay;
    }

    nodosContados++;
  }

  if (nodosContados === 0) return valorBase;

  const decayPromedio = decayAcumulado / nodosContados;
  const valorConDecay = valorBase * (1 - decayPromedio);
  const tieneHistorialReal = nodosDeLaVertiente.some(
    (n) => n.level >= 1 || n.dailyVerifiedAt != null
  );
  return tieneHistorialReal
    ? Math.max(NEN_AXIS_MIN_WITH_ACTIVITY, Math.round(valorConDecay))
    : 0;
}

/** Aplica decay científico a cada eje del perfil Nen (solo radar — no XP de nodos). */
export function applyNenProfileDecay(
  profile: NenProfile,
  allNodes: SkillNode[],
  now: Date = new Date()
): NenProfile {
  const result = { ...profile };

  (Object.keys(NEN_AXIS_VERTIENTES) as NenAxisId[]).forEach((axisId) => {
    const axisNodes = nodesForAxis(allNodes, axisId);
    result[axisId] = calcularValorEjeConDecay(
      profile[axisId],
      axisNodes,
      allNodes,
      now
    );
  });

  return result;
}

function statusLabelFor(
  status: NenAxisDecayStatus,
  daysSinceActivity: number | null,
  nodeName: string | null
): string {
  if (status === 'estable') return 'Ritmo estable en esta área';
  if (daysSinceActivity == null || !nodeName) {
    return status === 'en_decay'
      ? 'Esta área lleva tiempo sin actividad'
      : 'Esta área se está enfriando';
  }
  const dias = daysSinceActivity === 0 ? 'hoy' : `${daysSinceActivity} días`;
  return `«${nodeName}» lleva ${dias} sin actividad registrada`;
}

export function getNenAxisDecayInsight(
  axisId: NenAxisId,
  baseProfile: NenProfile,
  decayedProfile: NenProfile,
  allNodes: SkillNode[],
  now: Date = new Date()
): NenAxisDecayInsight {
  const axisNodes = nodesForAxis(allNodes, axisId);
  let stalest: SkillNode | null = null;
  let maxDays = -1;
  let hasDecay = false;
  let hasCooling = false;

  for (const node of axisNodes) {
    const cat = DECAY_CATEGORIAS[resolveDecayCategoria(node, allNodes)];
    const days = calendarDaysSince(lastActivityDate(node), now);
    const diasEnDecay = Math.max(0, days - cat.diasGracia);
    if (diasEnDecay > 0) hasDecay = true;
    if (getDecayState(node, now) === 'cooling') hasCooling = true;
    if (days > maxDays) {
      maxDays = days;
      stalest = node;
    }
  }

  let status: NenAxisDecayStatus = 'estable';
  if (hasDecay) status = 'en_decay';
  else if (hasCooling) status = 'enfriando';

  const statusLabel =
    status === 'estable'
      ? 'Estable'
      : status === 'enfriando'
        ? 'Enfriando'
        : 'En decay';

  return {
    axisId,
    value: decayedProfile[axisId],
    baseValue: baseProfile[axisId],
    status,
    stalestNode: stalest,
    daysSinceActivity: stalest && maxDays >= 0 ? maxDays : null,
    statusLabel: `${statusLabel} — ${statusLabelFor(status, maxDays >= 0 ? maxDays : null, stalest?.name ?? null)}`,
  };
}

export function buildNenAxisDecayInsights(
  baseProfile: NenProfile,
  decayedProfile: NenProfile,
  allNodes: SkillNode[],
  now: Date = new Date()
): NenAxisDecayInsight[] {
  return (Object.keys(NEN_AXIS_VERTIENTES) as NenAxisId[]).map((axisId) =>
    getNenAxisDecayInsight(axisId, baseProfile, decayedProfile, allNodes, now)
  );
}

export function axisIdsInActiveDecay(
  insights: NenAxisDecayInsight[]
): Record<NenAxisId, boolean> {
  const map = {} as Record<NenAxisId, boolean>;
  for (const insight of insights) {
    map[insight.axisId] = insight.status === 'en_decay' || insight.status === 'enfriando';
  }
  return map;
}
