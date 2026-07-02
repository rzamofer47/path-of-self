import {
  EMPTY_NEN_PROFILE,
  isNenActiveNode,
  NEN_AXIS_MAX,
  NEN_AXIS_SCALE,
  NEN_AXIS_VERTIENTES,
  NEN_AXIS_LABELS,
  NEN_AXIS_IDS_ORDER,
  NenAxisId,
  NenProfile,
  resolveNenAxisId,
  resolveVertienteId,
  VERTIENTE_DISPLAY_NAMES,
  VertienteId,
} from '@/src/config/nenConfig';
import { NEN_HEXAGON_CLOCKWISE_FROM_NE, NEN_HEXAGON_VERTEX_DEG } from '@/src/utils/mapGeometry';
import { SkillNode } from '@/src/types';

function clampAxis(value: number): number {
  return Math.min(NEN_AXIS_MAX, Math.max(0, value));
}

function averageAxisValues(values: number[]): number {
  const valid = values.filter((value) => Number.isFinite(value));
  if (valid.length === 0) return 0;
  return clampAxis(valid.reduce((acc, value) => acc + value, 0) / valid.length);
}

/** Peso por nodo activo + nivel — el radar crece al acumular checks/hijos. */
const NEN_NODE_BASE = 10;
/** Escala del acumulado por eje (sin suelo artificial — 0 = sin práctica real). */
const NEN_AXIS_SUM_SCALE = 1.25;

/** Valor 0-100 de un eje Nen agrupando raíces madre y vertientes activas. */
export function calculateNenAxisValue(allNodes: SkillNode[], axisId: NenAxisId): number {
  const active = allNodes.filter((node) => {
    if (!isNenActiveNode(node)) return false;
    return resolveNenAxisId(node, allNodes) === axisId;
  });

  if (active.length === 0) return 0;

  const sum = active.reduce(
    (total, node) => total + NEN_NODE_BASE + node.level * NEN_AXIS_SCALE,
    0
  );
  return clampAxis(Math.min(NEN_AXIS_MAX, sum / NEN_AXIS_SUM_SCALE));
}

/** Valor 0-100 de una vertiente concreta (útil para diagnóstico). */
export function calculateNenAxis(nodes: SkillNode[], vertienteId: VertienteId): number {
  const active = nodes.filter((node) => {
    const vertiente = resolveVertienteId(node, nodes);
    return vertiente === vertienteId && isNenActiveNode(node);
  });

  if (active.length === 0) return 0;

  const sum = active.reduce(
    (total, node) => total + NEN_NODE_BASE + node.level * NEN_AXIS_SCALE,
    0
  );
  return clampAxis(Math.min(NEN_AXIS_MAX, sum / NEN_AXIS_SUM_SCALE));
}

export function calculateNenHexagon(allNodes: SkillNode[]): NenProfile {
  const profile = { ...EMPTY_NEN_PROFILE };

  NEN_AXIS_IDS_ORDER.forEach((axisId) => {
    profile[axisId] = calculateNenAxisValue(allNodes, axisId);
  });

  return profile;
}

function axisIdForVertiente(vertienteId: VertienteId): NenAxisId | null {
  for (const [axisId, vertientes] of Object.entries(NEN_AXIS_VERTIENTES) as [
    NenAxisId,
    readonly VertienteId[],
  ][]) {
    if (vertientes.includes(vertienteId)) return axisId;
  }
  return null;
}

/** Dev-only: confirma que cada vertiente resuelve al eje Nen esperado. */
export function logNenAxisVertienteSync(nodes: SkillNode[]): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;

  const probes: { label: string; slug: string; expectedAxis: NenAxisId }[] = [
    { label: 'Gimnasio → Intensificación', slug: 'discipline_physical_gimnasio', expectedAxis: 'intensification' },
    { label: 'Coding → Manipulación', slug: 'discipline_productive_coding', expectedAxis: 'manipulation' },
    { label: 'Writing → Emisión', slug: 'discipline_productive_writing', expectedAxis: 'emission' },
    { label: 'Enfoque → Materialización', slug: 'discipline_mental_emotional_enfoque', expectedAxis: 'materialization' },
    { label: 'Judo → Transformación', slug: 'discipline_physical_judo', expectedAxis: 'transformation' },
    { label: 'Fisioterapia → Transformación', slug: 'discipline_physical_fisioterapia', expectedAxis: 'transformation' },
    { label: 'Nervioso → Especialización', slug: 'discipline_mental_emotional_nervioso', expectedAxis: 'specialization' },
    { label: 'Lectura → Especialización', slug: 'discipline_mental_emotional_lectura', expectedAxis: 'specialization' },
  ];

  console.log('[Nen] Auditoría hexágono — eje ↔ vertiente (6 núcleos madre)');
  for (const probe of probes) {
    const node = nodes.find((candidate) => candidate.slug === probe.slug);
    if (!node) {
      console.log(`  · ${probe.label}: hub ${probe.slug} no encontrado`);
      continue;
    }
    const vertiente = resolveVertienteId(node, nodes);
    const axis = vertiente ? axisIdForVertiente(vertiente) : null;
    const ok = axis === probe.expectedAxis;
    console.log(
      `  · ${probe.label}: vertiente=${vertiente ?? 'null'} → eje=${axis ?? 'null'} ${
        ok ? '✓' : `✗ (esperado ${probe.expectedAxis})`
      }`
    );
  }

  console.log('[Nen] Ángulos de núcleos (hexágono regular 60°):');
  for (const axisId of NEN_HEXAGON_CLOCKWISE_FROM_NE) {
    console.log(`  · ${NEN_AXIS_LABELS[axisId]} (${axisId}): ${NEN_HEXAGON_VERTEX_DEG[axisId]}°`);
  }

  console.log('[Nen] calculateNenAxisValue por eje:');
  for (const axisId of NEN_AXIS_IDS_ORDER) {
    const value = calculateNenAxisValue(nodes, axisId);
    const vertientes = NEN_AXIS_VERTIENTES[axisId]
      .map((v) => `${v} (${VERTIENTE_DISPLAY_NAMES[v]})`)
      .join(' + ') || '(vacío)';
    console.log(`  · ${NEN_AXIS_LABELS[axisId]} [${axisId}] = ${value} ← ${vertientes}`);
  }
}

export function averageNenProfiles(profiles: NenProfile[]): NenProfile {
  if (profiles.length === 0) return { ...EMPTY_NEN_PROFILE };

  const result = { ...EMPTY_NEN_PROFILE };
  for (const axisId of NEN_AXIS_IDS_ORDER) {
    const values = profiles.map((profile) => profile[axisId]);
    result[axisId] = averageAxisValues(values);
  }
  return result;
}
