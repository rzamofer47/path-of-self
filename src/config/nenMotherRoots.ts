import { MacroArea, NodeType } from '@/src/types';
import {
  MAP_ORIGIN_X,
  MAP_ORIGIN_Y,
  NEN_HEXAGON_VERTEX_DEG,
  ORB_RADIUS,
  ROOT_ORBIT_RADIUS,
  assertRegularNenHexagon,
  canvasDegToRad,
  type NenHexagonVertexKey,
} from '@/src/utils/mapGeometry';

export interface NodeOrbPalette {
  border: string;
  glow: string;
  accentSecondary: string;
}

export const NEN_ROOT_ORBIT_RADIUS = ROOT_ORBIT_RADIUS;

if (typeof __DEV__ !== 'undefined' && __DEV__) {
  assertRegularNenHexagon();
}

/** Ejes del hexágono Nen — nodos madre en el centro del mapa. */
export type NenMotherId = NenHexagonVertexKey;

export interface NenMotherRootDef {
  id: NenMotherId;
  slug: string;
  name: string;
  type: NodeType;
  macroArea: MacroArea;
  /** Grados de brújula del lienzo (hexágono regular, 60° entre vértices). */
  vectorDeg: number;
}

/** Vértices del hexágono central a ROOT_ORBIT_RADIUS del origen. */
export const NEN_MOTHER_ROOTS: readonly NenMotherRootDef[] = [
  {
    id: 'intensification',
    slug: 'root_intensificacion',
    name: 'Forja del Cuerpo: Intensificación',
    type: 'physical',
    macroArea: 'physical',
    vectorDeg: NEN_HEXAGON_VERTEX_DEG.intensification,
  },
  {
    id: 'manipulation',
    slug: 'root_manipulacion',
    name: 'Núcleo de Arquitectura Lógica',
    type: 'intellectual',
    macroArea: 'productive',
    vectorDeg: NEN_HEXAGON_VERTEX_DEG.manipulation,
  },
  {
    id: 'emission',
    slug: 'root_emision',
    name: 'Faro de Proyección Externa',
    type: 'intellectual',
    macroArea: 'productive',
    vectorDeg: NEN_HEXAGON_VERTEX_DEG.emission,
  },
  {
    id: 'materialization',
    slug: 'root_materializacion',
    name: 'Cámara del Intelecto: Materialización',
    type: 'intellectual',
    macroArea: 'mental_emotional',
    vectorDeg: NEN_HEXAGON_VERTEX_DEG.materialization,
  },
  {
    id: 'transformation',
    slug: 'root_transformacion',
    name: 'Altar de Transmutación Biológica',
    type: 'physical',
    macroArea: 'physical',
    vectorDeg: NEN_HEXAGON_VERTEX_DEG.transformation,
  },
  {
    id: 'specialization',
    slug: 'root_especializacion',
    name: 'Cámara del Analista / Filósofo',
    type: 'intellectual',
    macroArea: 'mental_emotional',
    vectorDeg: NEN_HEXAGON_VERTEX_DEG.specialization,
  },
] as const;

/**
 * Vertientes de catálogo que alimentan cada núcleo madre y su eje en el Radar Nen.
 * Fuente única — `nenConfig.NEN_AXIS_VERTIENTES` debe importar este mapa.
 */
export const NEN_MOTHER_VERTIENTE_KEYS: Record<NenMotherId, readonly string[]> = {
  intensification: ['gimnasio'],
  manipulation: ['coding'],
  emission: ['writing'],
  materialization: ['enfoque'],
  transformation: ['judo', 'fisioterapia'],
  specialization: ['nervioso', 'lectura'],
};

export const NEN_MOTHER_VECTOR_DEG: Record<NenMotherId, number> = Object.fromEntries(
  NEN_MOTHER_ROOTS.map((root) => [root.id, root.vectorDeg])
) as Record<NenMotherId, number>;

export const NEN_MOTHER_VECTOR_RAD: Record<NenMotherId, number> = Object.fromEntries(
  NEN_MOTHER_ROOTS.map((root) => [root.id, canvasDegToRad(root.vectorDeg)])
) as Record<NenMotherId, number>;

export const NEN_MOTHER_SLUG_BY_ID: Record<NenMotherId, string> = Object.fromEntries(
  NEN_MOTHER_ROOTS.map((root) => [root.id, root.slug])
) as Record<NenMotherId, string>;

export const NEN_MOTHER_BY_SLUG: Record<string, NenMotherRootDef> = Object.fromEntries(
  NEN_MOTHER_ROOTS.map((root) => [root.slug, root])
);

/** Migración desde raíces macro-área legacy. */
export const LEGACY_ROOT_SLUG_TO_NEN: Record<string, string> = {
  root_fisica: 'root_intensificacion',
  root_productiva: 'root_manipulacion',
  root_mental: 'root_especializacion',
  root_intelectual: 'root_especializacion',
};

/** Raíz Nen por macro-área (comodines y fallback de parent_id). */
export const NEN_ROOT_SLUG_BY_MACRO: Record<MacroArea, string> = {
  physical: 'root_intensificacion',
  intellectual: 'root_especializacion',
  mental_emotional: 'root_especializacion',
  productive: 'root_manipulacion',
};

const NEN_ROOT_PALETTE_ACTIVE: Record<string, NodeOrbPalette> = {
  root_intensificacion: {
    border: '#4ade80',
    glow: '#86efac',
    accentSecondary: '#166534',
  },
  root_manipulacion: {
    border: '#22d3ee',
    glow: '#67e8f9',
    accentSecondary: '#0e7490',
  },
  root_emision: {
    border: '#fb923c',
    glow: '#fdba74',
    accentSecondary: '#c2410c',
  },
  root_materializacion: {
    border: '#facc15',
    glow: '#fde047',
    accentSecondary: '#a16207',
  },
  root_transformacion: {
    border: '#c084fc',
    glow: '#e879f9',
    accentSecondary: '#7e22ce',
  },
  root_especializacion: {
    border: '#e2e8f0',
    glow: '#f8fafc',
    accentSecondary: '#94a3b8',
  },
};

const NEN_ROOT_PALETTE_MUTED: Record<string, NodeOrbPalette> = {
  root_intensificacion: {
    border: '#3f6f4a',
    glow: '#4ade80',
    accentSecondary: '#1a3322',
  },
  root_manipulacion: {
    border: '#1e5f6e',
    glow: '#22d3ee',
    accentSecondary: '#0c2a33',
  },
  root_emision: {
    border: '#8a4520',
    glow: '#fb923c',
    accentSecondary: '#3d1f0c',
  },
  root_materializacion: {
    border: '#787016',
    glow: '#ca8a04',
    accentSecondary: '#422006',
  },
  root_transformacion: {
    border: '#5b348a',
    glow: '#c084fc',
    accentSecondary: '#2a1640',
  },
  root_especializacion: {
    border: '#64748b',
    glow: '#cbd5e1',
    accentSecondary: '#334155',
  },
};

export function getNenMotherRootPosition(
  motherId: NenMotherId,
  radius = NEN_ROOT_ORBIT_RADIUS
): { logX: number; logY: number; posX: number; posY: number } {
  const angle = NEN_MOTHER_VECTOR_RAD[motherId];
  const logX = radius * Math.cos(angle);
  const logY = radius * Math.sin(angle);
  return {
    logX,
    logY,
    posX: MAP_ORIGIN_X + logX - ORB_RADIUS,
    posY: MAP_ORIGIN_Y + logY - ORB_RADIUS,
  };
}

export function getNenRootPalette(slug: string | null | undefined, active: boolean): NodeOrbPalette | null {
  const resolved = resolveNenMotherSlug(slug);
  if (!resolved) return null;
  const palettes = active ? NEN_ROOT_PALETTE_ACTIVE : NEN_ROOT_PALETTE_MUTED;
  return palettes[resolved] ?? null;
}

export function resolveNenMotherSlug(slug: string | null | undefined): string | null {
  if (!slug) return null;
  if (NEN_MOTHER_BY_SLUG[slug]) return slug;
  return LEGACY_ROOT_SLUG_TO_NEN[slug] ?? null;
}
