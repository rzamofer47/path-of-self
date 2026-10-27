import {
  EMPTY_NEN_PROFILE,
  isNenActiveNode,
  NEN_AXIS_MAX,
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
import { getCatalogNodeMeta } from '@/src/data/catalogNodeIndex';
import { NEN_HEXAGON_CLOCKWISE_FROM_NE, NEN_HEXAGON_VERTEX_DEG } from '@/src/utils/mapGeometry';
import { isRootNode } from '@/src/utils/nodeMenuPolicy';
import { resolveNodeCatalogGeneration } from '@/src/utils/nodeSectorLayout';
import { SkillNode } from '@/src/types';

function getParentNode(nodes: SkillNode[], node: SkillNode): SkillNode | null {
  if (node.parentId == null) return null;
  return nodes.find((candidate) => candidate.id === node.parentId) ?? null;
}

function clampAxis(value: number): number {
  return Math.min(NEN_AXIS_MAX, Math.max(0, value));
}

function averageAxisValues(values: number[]): number {
  const valid = values.filter((value) => Number.isFinite(value));
  if (valid.length === 0) return 0;
  return clampAxis(valid.reduce((acc, value) => acc + value, 0) / valid.length);
}

/** Aros del radar = generaciones 1…6 (Gen 6 = hito crítico en el borde). */
const NEN_RING_GENERATIONS = 6;

function resolvePracticeGeneration(node: SkillNode, allNodes: SkillNode[]): number {
  const meta = getCatalogNodeMeta(node.slug);
  if (meta != null) {
    return Math.min(NEN_RING_GENERATIONS, Math.max(0, meta.generation));
  }

  if (isRootNode(node)) return 0;

  const parent = getParentNode(allNodes, node);
  return resolveNodeCatalogGeneration(allNodes, node, parent);
}

/** Progreso fino dentro del aro actual (nivel/XP), sin saltar generación. */
function practiceLevelBonus(node: SkillNode): number {
  const bandWidth = NEN_AXIS_MAX / NEN_RING_GENERATIONS;
  const levelPart = Math.min(1, Math.max(0, node.level - 1) / 4);
  const xpPart = Math.min(1, node.xp / 200);
  const progress = Math.min(1, levelPart * 0.6 + xpPart * 0.4);
  return progress * bandWidth * 0.45;
}

function axisValueFromPracticeDepth(maxGeneration: number, levelBonus: number): number {
  const ringFill = ((maxGeneration + 1) / NEN_RING_GENERATIONS) * NEN_AXIS_MAX;
  return clampAxis(Math.min(NEN_AXIS_MAX, ringFill + levelBonus));
}

/** Valor 0-100 de un eje Nen según la generación más profunda practicada en ese eje. */
export function calculateNenAxisValue(allNodes: SkillNode[], axisId: NenAxisId): number {
  const active = allNodes.filter((node) => {
    if (!isNenActiveNode(node)) return false;
    if (node.layer === 'root') return false;
    return resolveNenAxisId(node, allNodes) === axisId;
  });

  if (active.length === 0) return 0;

  let maxGeneration = 0;
  let maxBonus = 0;

  for (const node of active) {
    const generation = resolvePracticeGeneration(node, allNodes);
    maxGeneration = Math.max(maxGeneration, generation);
    maxBonus = Math.max(maxBonus, practiceLevelBonus(node));
  }

  return axisValueFromPracticeDepth(maxGeneration, maxBonus);
}

/** Valor 0-100 de una vertiente concreta (útil para diagnóstico). */
export function calculateNenAxis(nodes: SkillNode[], vertienteId: VertienteId): number {
  const active = nodes.filter((node) => {
    if (!isNenActiveNode(node) || node.layer === 'root') return false;
    const vertiente = resolveVertienteId(node, nodes);
    return vertiente === vertienteId;
  });

  if (active.length === 0) return 0;

  let maxGeneration = 0;
  let maxBonus = 0;

  for (const node of active) {
    const generation = resolvePracticeGeneration(node, nodes);
    maxGeneration = Math.max(maxGeneration, generation);
    maxBonus = Math.max(maxBonus, practiceLevelBonus(node));
  }

  return axisValueFromPracticeDepth(maxGeneration, maxBonus);
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
    { label: 'Judo → Intensificación', slug: 'discipline_physical_judo', expectedAxis: 'intensification' },
    { label: 'Fisioterapia → Intensificación', slug: 'discipline_physical_fisioterapia', expectedAxis: 'intensification' },
    { label: 'Inversión I1 → Manipulación', slug: 'prod_invest_i1', expectedAxis: 'manipulation' },
    { label: 'Video → Emisión', slug: 'discipline_emission_video', expectedAxis: 'emission' },
    { label: 'Productos → Materialización', slug: 'discipline_materialization_productos', expectedAxis: 'materialization' },
    { label: 'Inglés → Transformación', slug: 'discipline_transformation_ingles', expectedAxis: 'transformation' },
    { label: 'Lectura → Especialización', slug: 'discipline_specialization_lectura', expectedAxis: 'specialization' },
    { label: 'Filosofía → Especialización', slug: 'discipline_specialization_filosofia', expectedAxis: 'specialization' },
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

  console.log('[Nen] calculateNenAxisValue por eje (profundidad de generación):');
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
