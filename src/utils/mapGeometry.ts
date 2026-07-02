import { MacroArea } from '@/src/types';

export const CANVAS_WIDTH = 2400;
export const CANVAS_HEIGHT = 2400;
export const ORB_SIZE = 50;
export const ORB_RADIUS = ORB_SIZE / 2;

export const MAP_ORIGIN_X = CANVAS_WIDTH / 2;
export const MAP_ORIGIN_Y = CANVAS_HEIGHT / 2;

/** Nodos madre Nen (hexágono central). */
export const ROOT_ORBIT_RADIUS = 220;

/** Separación radial fija entre generaciones consecutivas (desde el centro del lienzo). */
export const GENERATION_GAP_PX = 250;

/** Primera generación de catálogo tras las raíces: ROOT + 250px. */
export const GENERATION_1_RADIUS_PX = ROOT_ORBIT_RADIUS + GENERATION_GAP_PX;

export const GENERATION_MAX = 6;

/** Gen catálogo n (índice n) = ROOT + n×250. Índice 0 reservado. */
export const GENERATION_RADII_BY_LEVEL: readonly number[] = [
  0,
  ...Array.from(
    { length: GENERATION_MAX },
    (_, index) => ROOT_ORBIT_RADIUS + (index + 1) * GENERATION_GAP_PX
  ),
] as readonly number[];

/** @deprecated Usar GENERATION_GAP_PX */
export const ORBIT_GAP = GENERATION_GAP_PX;

/** @deprecated Usar GENERATION_RADII_BY_LEVEL[2] */
export const ORBIT_2_RADIUS = GENERATION_RADII_BY_LEVEL[2];

/** @deprecated Usar GENERATION_RADII_BY_LEVEL[3] */
export const ORBIT_3_RADIUS = GENERATION_RADII_BY_LEVEL[3];

/** @deprecated Usar GENERATION_RADII_BY_LEVEL[4] */
export const ORBIT_4_RADIUS = GENERATION_RADII_BY_LEVEL[4];

export const ORBIT_RADII = [
  ROOT_ORBIT_RADIUS,
  GENERATION_RADII_BY_LEVEL[2],
  GENERATION_RADII_BY_LEVEL[3],
  GENERATION_RADII_BY_LEVEL[4],
] as const;

/** Separación angular mínima entre hermanos (45°). */
export const MIN_SIBLING_ANGLE_RAD = Math.PI / 4;

/** Hexágono Nen regular — 6 vértices a 60° constantes desde el centro del lienzo. */
export const NEN_HEXAGON_VERTEX_COUNT = 6;
export const NEN_HEXAGON_SEPARATION_DEG = 360 / NEN_HEXAGON_VERTEX_COUNT;

export type NenHexagonVertexKey =
  | 'intensification'
  | 'manipulation'
  | 'emission'
  | 'materialization'
  | 'transformation'
  | 'specialization';

/**
 * Orden horario desde Nordeste (30°). Cada entrada suma exactamente 60° a la anterior.
 * 30° Manipulación · 90° Intensificación · 150° Especialización ·
 * 210° Transformación · 270° Materialización · 330° Emisión.
 */
export const NEN_HEXAGON_CLOCKWISE_FROM_NE: readonly NenHexagonVertexKey[] = [
  'manipulation',
  'intensification',
  'specialization',
  'transformation',
  'materialization',
  'emission',
] as const;

/** Primer vértice del hexágono (Nordeste). 360° / 6 = 60° entre todos los núcleos. */
export const NEN_HEXAGON_START_DEG = 30;

/** Grados de brújula del lienzo — derivados, no editar a mano (evita huecos de 120°). */
export const NEN_HEXAGON_VERTEX_DEG: Record<NenHexagonVertexKey, number> = Object.fromEntries(
  NEN_HEXAGON_CLOCKWISE_FROM_NE.map((key, index) => [
    key,
    (NEN_HEXAGON_START_DEG + index * NEN_HEXAGON_SEPARATION_DEG) % 360,
  ])
) as Record<NenHexagonVertexKey, number>;

export function nenMotherOrbitAngleDeg(vertex: NenHexagonVertexKey): number {
  return NEN_HEXAGON_VERTEX_DEG[vertex];
}

/** Valida separación uniforme de 60° entre todos los vértices del hexágono Nen. */
export function assertRegularNenHexagon(): void {
  const angles = [...Object.values(NEN_HEXAGON_VERTEX_DEG)].sort((a, b) => a - b);
  for (let i = 1; i < angles.length; i++) {
    const step = (angles[i] - angles[i - 1] + 360) % 360;
    if (Math.abs(step - NEN_HEXAGON_SEPARATION_DEG) > 0.001) {
      throw new Error(
        `Hexágono Nen irregular: paso ${step}° entre ${angles[i - 1]}° y ${angles[i]}° (esperado 60°)`
      );
    }
  }
  const wrap = (angles[0] + 360) - angles[angles.length - 1];
  if (Math.abs(wrap - NEN_HEXAGON_SEPARATION_DEG) > 0.001) {
    throw new Error(`Hexágono Nen irregular: cierre ${wrap}° (esperado 60°)`);
  }
}

/** ≥5 hermanos → +100px de radio y abanico más amplio. */
export const HIGH_DENSITY_SIBLING_THRESHOLD = 5;
export const HIGH_DENSITY_RADIUS_BONUS_PX = 100;

/** Abanico extra para sub-órbitas densas (p. ej. 8 técnicas de Judo). */
export const HIGH_DENSITY_FAN_EXTRA_RAD = Math.PI / 5;

/** 1 = núcleo (raíz), 4 = órbita exterior avanzada. */
export type DifficultyTier = 1 | 2 | 3 | 4;

export const SECTOR_CENTER_DEG: Record<MacroArea, number> = {
  intellectual: 0,
  physical: 90,
  mental_emotional: 270,
  productive: 180,
};

export const SECTOR_CENTER_RAD: Record<MacroArea, number> = {
  intellectual: 0,
  physical: (-SECTOR_CENTER_DEG.physical * Math.PI) / 180,
  mental_emotional: (-SECTOR_CENTER_DEG.mental_emotional * Math.PI) / 180,
  productive: Math.PI,
};

/** Convierte grados de brújula del lienzo (0° = Este, 90° = Sur…) a radianes lógicos. */
export function canvasDegToRad(deg: number): number {
  return (-deg * Math.PI) / 180;
}

/** Radianes lógicos del lienzo → grados de brújula (0° = Este, 90° = Sur…). */
export function canvasDegFromLogicalRad(angleRad: number): number {
  const deg = (-angleRad * 180) / Math.PI;
  return ((deg % 360) + 360) % 360;
}

export function angularDeltaDeg(aDeg: number, bDeg: number): number {
  const a = ((aDeg % 360) + 360) % 360;
  const b = ((bDeg % 360) + 360) % 360;
  const diff = Math.abs(a - b);
  return Math.min(diff, 360 - diff);
}

/**
 * Eje Nen del vértice más cercano a un punto del lienzo (por ID string, no índice).
 * Grados canónicos: intensification 90°, manipulation 30°, emission 330°,
 * materialization 270°, transformation 210°, specialization 150°.
 */
export function resolveNenAxisFromCanvasPosition(
  centerX: number,
  centerY: number
): NenHexagonVertexKey {
  const dx = centerX - MAP_ORIGIN_X;
  const dy = centerY - MAP_ORIGIN_Y;
  const canvasDeg = canvasDegFromLogicalRad(Math.atan2(dy, dx));

  let best: NenHexagonVertexKey = 'intensification';
  let bestDelta = Infinity;

  for (const axisId of NEN_HEXAGON_CLOCKWISE_FROM_NE) {
    const delta = angularDeltaDeg(canvasDeg, NEN_HEXAGON_VERTEX_DEG[axisId]);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = axisId;
    }
  }

  return best;
}

export interface CatalogBranchPlacement {
  logX: number;
  logY: number;
  posX: number;
  posY: number;
  angleRad: number;
  radius: number;
}

/**
 * Posición rígida en una vertiente Nen: vector angular de la rama + micro-abanico ±15°.
 * Radio = ROOT_ORBIT + (generación + 1) × 250px desde el centro del lienzo.
 */
export function catalogNenMotherBranchPosition(
  branchVectorRad: number,
  generation: number,
  slotIndex: number,
  siblingCount: number,
  halfFanRad = MENTAL_BRANCH_FAN_HALF_RAD
): CatalogBranchPlacement {
  const angles = siblingAnglesMicroFan(branchVectorRad, siblingCount, halfFanRad);
  const angleRad = angles[slotIndex] ?? branchVectorRad;
  const radius = mentalGenerationRadiusPx(generation);
  const polar = polarCatalogPosition(angleRad, radius);
  return { ...polar, angleRad, radius };
}

/**
 * Posición de un hijo de catálogo siguiendo el vector angular del padre (+250px por generación).
 * Usar cuando el padre tiene parentSlug/parentId válido en la cadena del árbol.
 */
export function catalogChildPositionFromParent(
  parentLogX: number,
  parentLogY: number,
  generation: number,
  slotIndex: number,
  siblingCount: number,
  halfFanRad = MENTAL_BRANCH_FAN_HALF_RAD
): CatalogBranchPlacement {
  const branchVectorRad = Math.atan2(parentLogY, parentLogX);
  return catalogNenMotherBranchPosition(
    branchVectorRad,
    generation,
    slotIndex,
    siblingCount,
    halfFanRad
  );
}

/** Vertientes del Santuario Interior — vectores angulares exclusivos. */
export type MentalGalaxyBranch = 'nervioso' | 'enfoque' | 'lectura';

/** Sudoeste 240°, Sur 270°, Sudeste 300° (desde el centro del lienzo). */
export const MENTAL_BRANCH_VECTOR_DEG: Record<MentalGalaxyBranch, number> = {
  nervioso: 240,
  enfoque: 270,
  lectura: 300,
};

export const MENTAL_BRANCH_VECTOR_RAD: Record<MentalGalaxyBranch, number> = {
  nervioso: canvasDegToRad(MENTAL_BRANCH_VECTOR_DEG.nervioso),
  enfoque: canvasDegToRad(MENTAL_BRANCH_VECTOR_DEG.enfoque),
  lectura: canvasDegToRad(MENTAL_BRANCH_VECTOR_DEG.lectura),
};

/** Micro-abanico ±15° para hermanos sobre el mismo vector de vertiente. */
export const MENTAL_BRANCH_FAN_HALF_DEG = 15;
export const MENTAL_BRANCH_FAN_HALF_RAD = (MENTAL_BRANCH_FAN_HALF_DEG * Math.PI) / 180;

const SECTOR_HALF_WIDTH_DEG = 40;
const SECTOR_HALF_WIDTH_RAD = (SECTOR_HALF_WIDTH_DEG * Math.PI) / 180;
const SECTOR_USABLE_RATIO = 0.88;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeAngleRad(angle: number): number {
  let a = angle % (2 * Math.PI);
  if (a > Math.PI) a -= 2 * Math.PI;
  if (a <= -Math.PI) a += 2 * Math.PI;
  return a;
}

export function clampAngleToSector(angleRad: number, macroArea: MacroArea): number {
  const center = SECTOR_CENTER_RAD[macroArea];
  let delta = normalizeAngleRad(angleRad - center);
  delta = clamp(delta, -SECTOR_HALF_WIDTH_RAD, SECTOR_HALF_WIDTH_RAD);
  return normalizeAngleRad(center + delta);
}

export function orbitRadiusForTier(tier: DifficultyTier): number {
  return ORBIT_RADII[tier - 1];
}

/**
 * Radio acumulativo por generación del catálogo (desde el centro del lienzo).
 * Gen 0 (vertiente) = ROOT + 250px; Gen n = ROOT + (n+1)×250.
 * Sub-órbitas con ≥5 hermanos suman +100px.
 */
export function generationRadiusPx(generation: number, siblingCount = 1): number {
  const g = clamp(Math.floor(generation), 0, GENERATION_MAX);
  let base = ROOT_ORBIT_RADIUS + (g + 1) * GENERATION_GAP_PX;

  if (siblingCount >= HIGH_DENSITY_SIBLING_THRESHOLD) {
    base += HIGH_DENSITY_RADIUS_BONUS_PX;
  }

  return base;
}

/**
 * Radio estricto para galaxias Nen: Gen 0 = ROOT + 250; Gen n = ROOT + (n+1)×250.
 * Sin bonus de densidad — cada vertiente avanza por su vector exclusivo.
 */
export function mentalGenerationRadiusPx(generation: number): number {
  const g = clamp(Math.floor(generation), 0, GENERATION_MAX);
  return ROOT_ORBIT_RADIUS + (g + 1) * GENERATION_GAP_PX;
}

/**
 * Hermanos equiespaciados en ±15° alrededor del vector central de la vertiente.
 */
export function siblingAnglesMicroFan(
  vectorAngleRad: number,
  siblingCount: number,
  halfFanRad = MENTAL_BRANCH_FAN_HALF_RAD
): number[] {
  if (siblingCount <= 0) return [];
  if (siblingCount === 1) return [vectorAngleRad];

  const totalSpan = 2 * halfFanRad;
  const step = totalSpan / (siblingCount - 1);

  return Array.from({ length: siblingCount }, (_, index) =>
    normalizeAngleRad(vectorAngleRad - halfFanRad + step * index)
  );
}

/**
 * Posición rígida en el Santuario Interior: vector fijo por vertiente + progresión radial.
 */
export function catalogMentalBranchPosition(
  branch: MentalGalaxyBranch,
  generation: number,
  slotIndex: number,
  siblingCount: number
) {
  const vectorAngle = MENTAL_BRANCH_VECTOR_RAD[branch];
  const angles = siblingAnglesMicroFan(vectorAngle, siblingCount);
  const angle = angles[slotIndex] ?? vectorAngle;
  const radius = mentalGenerationRadiusPx(generation);
  return polarCatalogPosition(angle, radius);
}

/** @deprecated Alias para galaxia física — Gen 1…6 sin bonus de densidad. */
export const PHYSICAL_GENERATION_RADII: readonly number[] = [0, 1, 2, 3, 4, 5, 6].map(
  (gen) => generationRadiusPx(gen, 1)
);

/**
 * Ángulos equiespaciados alrededor del padre con separación mínima de 45°.
 * ≥5 hermanos: abanico radial más amplio.
 */
export function siblingAnglesForParent(
  parentAngleRad: number,
  siblingCount: number,
  macroArea?: MacroArea
): number[] {
  if (siblingCount <= 0) return [];
  if (siblingCount === 1) return [parentAngleRad];

  const highDensity = siblingCount >= HIGH_DENSITY_SIBLING_THRESHOLD;
  const minSpan = MIN_SIBLING_ANGLE_RAD * (siblingCount - 1);
  const totalSpan = highDensity ? minSpan + HIGH_DENSITY_FAN_EXTRA_RAD : minSpan;
  const halfSpan = totalSpan / 2;
  const step = totalSpan / (siblingCount - 1);

  return Array.from({ length: siblingCount }, (_, index) => {
    const angle = parentAngleRad - halfSpan + step * index;
    return macroArea != null ? clampAngleToSector(angle, macroArea) : normalizeAngleRad(angle);
  });
}

/** Ángulos equiespaciados dentro de un sector macro-área. */
export function evenSectorAngles(macroArea: MacroArea, count: number): number[] {
  const center = SECTOR_CENTER_RAD[macroArea];
  if (count <= 0) return [];
  if (count === 1) return [center];

  const minSpan = MIN_SIBLING_ANGLE_RAD * (count - 1);
  const sectorSpan = SECTOR_HALF_WIDTH_RAD * SECTOR_USABLE_RATIO * 2;
  const totalSpan = Math.max(minSpan, sectorSpan);
  const halfSpan = totalSpan / 2;
  const step = totalSpan / (count - 1);

  return Array.from({ length: count }, (_, index) =>
    normalizeAngleRad(center - halfSpan + step * index)
  );
}

export function logicalToPos(logX: number, logY: number) {
  return {
    posX: MAP_ORIGIN_X + logX - ORB_RADIUS,
    posY: MAP_ORIGIN_Y + logY - ORB_RADIUS,
  };
}

export function posToLogical(posX: number, posY: number) {
  return {
    logX: posX + ORB_RADIUS - MAP_ORIGIN_X,
    logY: posY + ORB_RADIUS - MAP_ORIGIN_Y,
  };
}

/** Posición en lienzo para un nodo raíz en su sector. */
export function sectorRootPosition(macroArea: MacroArea, radius = ROOT_ORBIT_RADIUS) {
  const angle = SECTOR_CENTER_RAD[macroArea];
  const logX = radius * Math.cos(angle);
  const logY = radius * Math.sin(angle);
  return { logX, logY, ...logicalToPos(logX, logY) };
}

export function polarCatalogPosition(angleRad: number, radius: number) {
  const logX = radius * Math.cos(angleRad);
  const logY = radius * Math.sin(angleRad);
  return { logX, logY, ...logicalToPos(logX, logY) };
}

export interface CatalogPlacementOptions {
  difficultyTier: DifficultyTier;
  slotIndex: number;
  slotCount: number;
}

/** Posición en anillo por tier de dificultad dentro del sector. */
export function catalogNodePosition(macroArea: MacroArea, options: CatalogPlacementOptions) {
  const { difficultyTier, slotIndex, slotCount } = options;
  const radius = orbitRadiusForTier(difficultyTier);
  const center = SECTOR_CENTER_RAD[macroArea];
  const angles = siblingAnglesForParent(center, slotCount, macroArea);
  const angle = angles[slotIndex] ?? center;
  return polarCatalogPosition(angle, radius);
}

/** Hijos en órbita exterior respecto al ángulo del hub. */
export function catalogSpokePosition(
  hubLogX: number,
  hubLogY: number,
  macroArea: MacroArea,
  difficultyTier: DifficultyTier,
  childIndex: number,
  childCount: number
) {
  const hubAngle = Math.atan2(hubLogY, hubLogX);
  const angles = siblingAnglesForParent(hubAngle, childCount, macroArea);
  const angle = angles[childIndex] ?? hubAngle;
  const radius = orbitRadiusForTier(difficultyTier);
  return polarCatalogPosition(angle, radius);
}

/**
 * Posición rígida para un nodo de catálogo por generación y hermanos.
 * Usado al sembrar la BD (coordenadas estáticas).
 * Omitir `macroArea` cuando los hermanos necesitan abanico amplio (p. ej. Judo gen 2).
 */
export function catalogGenerationPosition(
  parentAngleRad: number,
  generation: number,
  slotIndex: number,
  siblingCount: number,
  macroArea?: MacroArea
) {
  const angles = siblingAnglesForParent(parentAngleRad, siblingCount, macroArea);
  const angle = angles[slotIndex] ?? parentAngleRad;
  const radius = generationRadiusPx(generation, siblingCount);
  return polarCatalogPosition(angle, radius);
}

/** Radio base del orbe para colisiones en force-directed layout (~ORB visual). */
export const FORCE_LAYOUT_ORB_RADIUS_BASE = 44;

/** Gen 6 — límite exterior del abanico radial en la simulación. */
export const FORCE_LAYOUT_SECTOR_RADIUS_MAX = 1700;

/**
 * Estima la burbuja de colisión (orbe + etiqueta) para repulsión entre nodos.
 * Nombres largos ocupan más espacio horizontal que nodos cortos.
 */
export function estimateForceLayoutOrbRadius(name: string): number {
  const anchoTextoEstimado = name.length * 7;
  return Math.max(FORCE_LAYOUT_ORB_RADIUS_BASE + 20, anchoTextoEstimado / 2 + 15);
}
