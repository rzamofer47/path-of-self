import { SkillNode } from '@/src/types';
import { isRootNode } from '@/src/utils/nodeMenuPolicy';
import { ORB_RADIUS } from '@/src/utils/treeLayout';
import { resolveNenAxisFromCanvasPosition } from '@/src/utils/mapGeometry';
import {
  LEGACY_ROOT_SLUG_TO_NEN,
  NEN_MOTHER_BY_SLUG,
  NEN_MOTHER_VERTIENTE_KEYS,
} from '@/src/config/nenMotherRoots';

/** Nivel mínimo para contar como nodo activo en el Radar Nen. */
export const NEN_ACTIVE_MIN_LEVEL = 1;

export const NEN_AXIS_SCALE = 10;
export const NEN_AXIS_MAX = 100;
export const NEN_SMOOTHING_WINDOW_DAYS = 7;
export const NEN_HISTORY_RETENTION_DAYS = 30;

export type NenAxisId =
  | 'intensification'
  | 'transformation'
  | 'specialization'
  | 'emission'
  | 'manipulation'
  | 'materialization';

/**
 * Orden canónico de ejes (vértice arriba = intensification, luego horario).
 * Usar siempre IDs string — nunca índices en arrays legacy.
 */
export const NEN_AXIS_IDS_ORDER: NenAxisId[] = [
  'intensification',
  'manipulation',
  'emission',
  'materialization',
  'transformation',
  'specialization',
];

export type VertienteId =
  | 'gimnasio'
  | 'judo'
  | 'fisioterapia'
  | 'nervioso'
  | 'enfoque'
  | 'lectura'
  | 'guitar'
  | 'piano'
  | 'language'
  | 'coding'
  | 'writing'
  | 'design';

export const NEN_AXIS_LABELS: Record<NenAxisId, string> = {
  intensification: 'Intensificación',
  transformation: 'Transformación',
  specialization: 'Especialización',
  emission: 'Emisión',
  manipulation: 'Manipulación',
  materialization: 'Materialización',
};

export interface NenPaletaEntry {
  color: string;
  colorGlow: string;
  colorMuted: string;
  colorText: string;
  label: string;
}

/** Paleta canónica Hunter × Hunter por tipo de Nen. */
export const NEN_PALETA: Record<NenAxisId, NenPaletaEntry> = {
  intensification: {
    color: '#FFD700',
    colorGlow: 'rgba(255, 215, 0, 0.25)',
    colorMuted: '#6B5900',
    colorText: '#FFD700',
    label: 'Intensificación',
  },
  transformation: {
    color: '#A855F7',
    colorGlow: 'rgba(168, 85, 247, 0.25)',
    colorMuted: '#4A1D8C',
    colorText: '#C084FC',
    label: 'Transformación',
  },
  emission: {
    color: '#F97316',
    colorGlow: 'rgba(249, 115, 22, 0.25)',
    colorMuted: '#7C3210',
    colorText: '#FB923C',
    label: 'Emisión',
  },
  materialization: {
    color: '#3B82F6',
    colorGlow: 'rgba(59, 130, 246, 0.25)',
    colorMuted: '#1E3A8A',
    colorText: '#60A5FA',
    label: 'Materialización',
  },
  manipulation: {
    color: '#22C55E',
    colorGlow: 'rgba(34, 197, 94, 0.25)',
    colorMuted: '#14532D',
    colorText: '#4ADE80',
    label: 'Manipulación',
  },
  specialization: {
    color: '#EC4899',
    colorGlow: 'rgba(236, 72, 153, 0.25)',
    colorMuted: '#831843',
    colorText: '#F472B6',
    label: 'Especialización',
  },
};

/** Convierte entrada de paleta al formato de orbe del mapa. */
export function nenPaletaToOrbPalette(
  entry: NenPaletaEntry,
  active = true
): import('@/src/config/nenMotherRoots').NodeOrbPalette {
  if (!active) {
    return {
      border: entry.colorMuted,
      glow: entry.colorMuted,
      accentSecondary: entry.colorMuted,
    };
  }
  return {
    border: entry.color,
    glow: entry.color,
    accentSecondary: entry.colorMuted,
  };
}

export function getNenPaletaForNode(
  node: SkillNode,
  allNodes?: SkillNode[],
  active = true
): NenPaletaEntry | null {
  const axisId = resolveNenAxisId(node, allNodes);
  if (!axisId) return null;
  return NEN_PALETA[axisId];
}

/** Mapeo eje Nen → vertientes (importado de nenMotherRoots — fuente única con el mapa visual). */
export const NEN_AXIS_VERTIENTES: Record<NenAxisId, readonly VertienteId[]> =
  NEN_MOTHER_VERTIENTE_KEYS as Record<NenAxisId, readonly VertienteId[]>;

/** Etiquetas legibles de vertiente para logs y UI de diagnóstico. */
export const VERTIENTE_DISPLAY_NAMES: Record<VertienteId, string> = {
  gimnasio: 'Gimnasio (Hipertrofia y Fuerza en Rack)',
  coding: 'Desarrollo de Software e IA',
  writing: 'Creación de Contenido y Monetización Digital',
  enfoque: 'Enfoque, Cognición Aguda y Lanzamiento de Apps',
  judo: 'Judo Técnico',
  fisioterapia: 'Fisioterapia de Blindaje Articular',
  nervioso: 'Regulación del Sistema Nervioso',
  lectura: 'Lectura Estoica Diaria',
  guitar: 'Guitarra',
  piano: 'Piano',
  language: 'Idioma',
  design: 'Diseño y Marca Visual',
};

const SLUG_VERTIENTE_RULES: { prefix: string; vertiente: VertienteId }[] = [
  { prefix: 'phy_gym_', vertiente: 'gimnasio' },
  { prefix: 'discipline_physical_gimnasio', vertiente: 'gimnasio' },
  { prefix: 'phy_judo_', vertiente: 'judo' },
  { prefix: 'discipline_physical_judo', vertiente: 'judo' },
  { prefix: 'phy_physio_', vertiente: 'fisioterapia' },
  { prefix: 'discipline_physical_fisioterapia', vertiente: 'fisioterapia' },
  { prefix: 'men_nerv_', vertiente: 'nervioso' },
  { prefix: 'discipline_mental_emotional_nervioso', vertiente: 'nervioso' },
  { prefix: 'men_focus_', vertiente: 'enfoque' },
  { prefix: 'discipline_mental_emotional_enfoque', vertiente: 'enfoque' },
  { prefix: 'men_read_', vertiente: 'lectura' },
  { prefix: 'discipline_mental_emotional_lectura', vertiente: 'lectura' },
  { prefix: 'disc_guitar_', vertiente: 'guitar' },
  { prefix: 'discipline_intellectual_guitar', vertiente: 'guitar' },
  { prefix: 'disc_piano_', vertiente: 'piano' },
  { prefix: 'discipline_intellectual_piano', vertiente: 'piano' },
  { prefix: 'disc_lang_', vertiente: 'language' },
  { prefix: 'discipline_intellectual_language', vertiente: 'language' },
  { prefix: 'prod_code_', vertiente: 'coding' },
  { prefix: 'disc_code_', vertiente: 'coding' },
  { prefix: 'discipline_productive_coding', vertiente: 'coding' },
  { prefix: 'prod_write_', vertiente: 'writing' },
  { prefix: 'disc_write_', vertiente: 'writing' },
  { prefix: 'discipline_productive_writing', vertiente: 'writing' },
  { prefix: 'disc_design_', vertiente: 'design' },
  { prefix: 'discipline_productive_design', vertiente: 'design' },
];

/** wildcard_physical:judo → vertiente judo */
const WILDCARD_BUNDLE_VERTIENTE: Record<string, VertienteId> = {
  gimnasio: 'gimnasio',
  judo: 'judo',
  fisioterapia: 'fisioterapia',
  nervioso: 'nervioso',
  enfoque: 'enfoque',
  lectura: 'lectura',
  guitar: 'guitar',
  piano: 'piano',
  language: 'language',
  coding: 'coding',
  writing: 'writing',
  design: 'design',
};

function resolveConfiguredWildcardVertiente(slug: string): VertienteId | null {
  if (!slug.startsWith('wildcard_')) return null;
  const bundleKey = slug.split(':')[1];
  if (!bundleKey) return null;
  return WILDCARD_BUNDLE_VERTIENTE[bundleKey] ?? null;
}

export interface NenProfile {
  intensification: number;
  transformation: number;
  specialization: number;
  emission: number;
  manipulation: number;
  materialization: number;
}

export const EMPTY_NEN_PROFILE: NenProfile = {
  intensification: 0,
  transformation: 0,
  specialization: 0,
  emission: 0,
  manipulation: 0,
  materialization: 0,
};

export function resolveVertienteId(node: SkillNode, allNodes?: SkillNode[]): VertienteId | null {
  const slug = typeof node.slug === 'string' ? node.slug : '';
  const configured = resolveConfiguredWildcardVertiente(slug);
  if (configured) return configured;

  for (const rule of SLUG_VERTIENTE_RULES) {
    if (slug.startsWith(rule.prefix) || slug === rule.prefix) {
      return rule.vertiente;
    }
  }

  if (isRootNode(node)) {
    const axisId = resolveRootMotherAxisId(node);
    if (axisId) {
      const vertientes = NEN_AXIS_VERTIENTES[axisId];
      return vertientes[0] ?? null;
    }
  }

  if (allNodes && node.parentId != null) {
    const parent = allNodes.find((candidate) => candidate.id === node.parentId);
    if (parent) return resolveVertienteId(parent, allNodes);
  }
  return null;
}

function resolveMotherAxisFromSlug(slug: string): NenAxisId | null {
  const mother = NEN_MOTHER_BY_SLUG[slug];
  if (mother) return mother.id;
  const legacyTarget = LEGACY_ROOT_SLUG_TO_NEN[slug];
  if (legacyTarget) {
    const mapped = NEN_MOTHER_BY_SLUG[legacyTarget];
    if (mapped) return mapped.id;
  }
  return null;
}

/** Resuelve el eje de un nodo madre: posición en el hexágono manda sobre slug corrupto. */
export function resolveRootMotherAxisId(node: SkillNode): NenAxisId | null {
  if (!isRootNode(node)) return null;

  const centerX = node.posX + ORB_RADIUS;
  const centerY = node.posY + ORB_RADIUS;
  const axisFromPosition = resolveNenAxisFromCanvasPosition(centerX, centerY);

  const slug = typeof node.slug === 'string' ? node.slug : '';
  const axisFromSlug = slug ? resolveMotherAxisFromSlug(slug) : null;

  if (
    axisFromSlug &&
    axisFromSlug !== axisFromPosition &&
    typeof __DEV__ !== 'undefined' &&
    __DEV__
  ) {
    console.warn(
      `[Nen] Raíz "${node.name}" slug→${axisFromSlug} ≠ pos→${axisFromPosition}; usando posición del hexágono.`
    );
  }

  return axisFromPosition;
}

/** Eje Nen al que aporta un nodo (raíz madre o vertiente de catálogo). */
export function resolveNenAxisId(node: SkillNode, allNodes?: SkillNode[]): NenAxisId | null {
  if (isRootNode(node)) {
    return resolveRootMotherAxisId(node);
  }

  const slug = typeof node.slug === 'string' ? node.slug : '';
  const motherAxis = slug ? resolveMotherAxisFromSlug(slug) : null;
  if (motherAxis) return motherAxis;

  const vertiente = resolveVertienteId(node, allNodes);
  if (vertiente) {
    for (const [axisId, vertientes] of Object.entries(NEN_AXIS_VERTIENTES) as [
      NenAxisId,
      readonly VertienteId[],
    ][]) {
      if (vertientes.includes(vertiente)) return axisId;
    }
  }

  if (allNodes) {
    let current: SkillNode | undefined = node;
    const visited = new Set<number>();
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      if (isRootNode(current)) {
        return resolveRootMotherAxisId(current);
      }
      current =
        current.parentId != null
          ? allNodes.find((candidate) => candidate.id === current!.parentId)
          : undefined;
    }
  }

  const centerX = node.posX + ORB_RADIUS;
  const centerY = node.posY + ORB_RADIUS;
  return resolveNenAxisFromCanvasPosition(centerX, centerY);
}

export function hasNenProgress(node: SkillNode): boolean {
  if (node.layer === 'root' || node.layer === 'guide') {
    return (
      node.level > 1 ||
      node.lastPracticeAt != null ||
      node.dailyVerifiedAt != null
    );
  }

  return (
    node.level > 1 ||
    node.lastPracticeAt != null ||
    node.dailyVerifiedAt != null ||
    (node.xp > 0 && (node.layer === 'custom' || node.layer === 'locked'))
  );
}

/** Nodo activo para Nen: nivel >= 1 con progreso real (XP, práctica o check). */
export function isNenActiveNode(node: SkillNode): boolean {
  if (node.isDeleted) return false;
  if (node.layer === 'guide' || node.id < 0) return false;
  if (node.layer === 'dormant') return false;
  if (node.level < NEN_ACTIVE_MIN_LEVEL) return false;
  if (!hasNenProgress(node)) return false;

  if (node.layer === 'root') return true;

  return (
    node.layer === 'custom' ||
    node.layer === 'locked' ||
    (node.layer === 'wildcard' && hasNenProgress(node))
  );
}

export function getDominantNenAxis(profile: NenProfile): NenAxisId {
  const entries = Object.entries(profile) as [NenAxisId, number][];
  return entries.reduce((best, current) => (current[1] > best[1] ? current : best))[0];
}
