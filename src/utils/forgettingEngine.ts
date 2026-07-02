import { NodeType, SkillNode, User } from '@/src/types';

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/** Clasificación cognitiva de la habilidad para la curva de olvido. */
export type MemoryKind = 'declarative' | 'procedural';

export interface ForgettingContext {
  /** Exponente de la curva: <1 suaviza, >1 acelera el olvido tardío. */
  curveExponent: number;
  declarativeRateMult: number;
  proceduralRateMult: number;
  graceMult: number;
  globalMultiplier: number;
}

export interface NodeForgettingProfile {
  memoryKind: MemoryKind;
  graceMs: number;
  /** Fracción de XP perdida por día efectivo (tras periodo de gracia). */
  dailyRate: number;
  curveExponent: number;
}

export interface ForgettingSnapshot {
  memoryKind: MemoryKind;
  graceMs: number;
  elapsedMs: number;
  rawDecayDays: number;
  effectiveDecayDays: number;
  dailyRate: number;
  curveExponent: number;
  xpBefore: number;
  xpLoss: number;
  /** 1 = sin pérdida reciente, 0 = oxidación máxima visual. */
  retentionRatio: number;
}

/** Tasas base diarias (post-gracia) — declarativas olvidan más rápido. */
export const BASE_FORGETTING_RATES: Record<MemoryKind, number> = {
  declarative: 0.065,
  procedural: 0.022,
};

/** Periodos de gracia base antes de iniciar el olvido. */
export const BASE_GRACE_MS: Record<MemoryKind, number> = {
  declarative: 36 * MS_PER_HOUR,
  procedural: 72 * MS_PER_HOUR,
};

const PROCEDURAL_PHYSICAL_GRACE_MS = 5 * MS_PER_DAY;

const DECLARATIVE_KEYWORDS = [
  'vocabulario',
  'idioma',
  'language',
  'lectura',
  'reading',
  'flashcard',
  'comprension',
  'comprensión',
  'repertorio',
  'revision',
  'revisión',
  'pomodoro',
  'wireframe',
  'sistema visual',
  'borrador',
  'edicion',
  'edición',
  'publicacion',
  'publicación',
  'journal',
  'journaling',
  'gratitud',
  'patrones',
  'check-in',
  'algoritmos',
];

const PROCEDURAL_KEYWORDS = [
  'kata',
  'kihon',
  'kumite',
  'saludo',
  'postura',
  'yoga',
  'calentamiento',
  'ritmo',
  'digitacion',
  'digitación',
  'escala',
  'acordes',
  'tecnica',
  'técnica',
  'body scan',
  'respiracion',
  'respiración',
  '478',
  'diafragma',
  'anclaje',
  'fundamentos',
  'entrenamiento',
  'fuerza',
  'flexibilidad',
];

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function haystack(node: Pick<SkillNode, 'slug' | 'name'>): string {
  return normalizeToken(`${node.slug ?? ''} ${node.name}`);
}

function matchesAny(hay: string, keywords: readonly string[]): boolean {
  return keywords.some((kw) => hay.includes(normalizeToken(kw)));
}

/**
 * Clasifica si la habilidad es declarativa (hechos, vocabulario) o
 * procedimental (técnicas motoras, rutinas encadenadas).
 */
export function classifyMemoryKind(
  node: Pick<SkillNode, 'type' | 'slug' | 'name' | 'macroArea'>
): MemoryKind {
  const hay = haystack(node);

  if (matchesAny(hay, PROCEDURAL_KEYWORDS)) return 'procedural';
  if (matchesAny(hay, DECLARATIVE_KEYWORDS)) return 'declarative';

  if (node.type === 'physical') return 'procedural';

  if (node.macroArea === 'mental_emotional') {
    if (matchesAny(hay, ['meditacion', 'meditación', 'silencio', 'mindfulness'])) {
      return 'procedural';
    }
  }

  if (node.macroArea === 'physical') return 'procedural';

  return 'declarative';
}

/**
 * Deriva factores cognitivos y de estilo de vida a partir del cuestionario inicial.
 * Sin dependencias de UI — solo lee el perfil persistido del usuario.
 */
export function buildForgettingContext(user: User): ForgettingContext {
  let curveExponent = 1;
  let declarativeRateMult = 1;
  let proceduralRateMult = 1;
  let graceMult = 1;

  if (user.profile === 'young') {
    declarativeRateMult *= 1.08;
    proceduralRateMult *= 0.95;
    curveExponent *= 1.04;
  } else {
    declarativeRateMult *= 1.05;
    graceMult *= 1.12;
    curveExponent *= 0.96;
  }

  switch (user.practiceFrequency) {
    case 'daily':
      curveExponent *= 0.88;
      graceMult *= 1.14;
      proceduralRateMult *= 0.94;
      break;
    case 'weekly':
      break;
    case 'occasional':
      curveExponent *= 1.22;
      graceMult *= 0.88;
      declarativeRateMult *= 1.12;
      proceduralRateMult *= 1.06;
      break;
    default:
      break;
  }

  switch (user.focusPreference) {
    case 'physical':
      proceduralRateMult *= 0.9;
      declarativeRateMult *= 1.06;
      curveExponent *= 0.97;
      break;
    case 'intellectual':
      declarativeRateMult *= 0.92;
      proceduralRateMult *= 1.05;
      curveExponent *= 1.03;
      break;
    case 'balanced':
      curveExponent *= 0.96;
      graceMult *= 1.04;
      break;
    default:
      break;
  }

  if (user.retentionConcern) {
    declarativeRateMult *= 1.1;
    curveExponent *= 1.08;
    graceMult *= 0.92;
  } else {
    declarativeRateMult *= 0.96;
    curveExponent *= 0.94;
  }

  switch (user.goalType) {
    case 'maintenance':
      curveExponent *= 0.85;
      graceMult *= 1.2;
      declarativeRateMult *= 0.94;
      proceduralRateMult *= 0.92;
      break;
    case 'mastery':
      curveExponent *= 1.05;
      proceduralRateMult *= 0.94;
      declarativeRateMult *= 1.02;
      break;
    case 'exploration':
      curveExponent *= 1.18;
      declarativeRateMult *= 1.08;
      proceduralRateMult *= 1.04;
      break;
    default:
      break;
  }

  if (user.retentionShield) {
    graceMult *= 2;
    declarativeRateMult *= 0.9;
  }

  curveExponent = clamp(curveExponent, 0.72, 1.45);

  return {
    curveExponent,
    declarativeRateMult,
    proceduralRateMult,
    graceMult,
    globalMultiplier: user.decaySpeedModifier,
  };
}

export function buildNodeForgettingProfile(
  node: Pick<SkillNode, 'type' | 'slug' | 'name' | 'macroArea'>,
  user: User
): NodeForgettingProfile {
  const memoryKind = classifyMemoryKind(node);
  const ctx = buildForgettingContext(user);

  let graceMs = BASE_GRACE_MS[memoryKind] * ctx.graceMult;
  if (memoryKind === 'procedural' && node.type === 'physical') {
    graceMs = Math.max(graceMs, PROCEDURAL_PHYSICAL_GRACE_MS * ctx.graceMult);
  }

  const kindMult =
    memoryKind === 'declarative' ? ctx.declarativeRateMult : ctx.proceduralRateMult;

  const dailyRate = BASE_FORGETTING_RATES[memoryKind] * kindMult * ctx.globalMultiplier;

  return {
    memoryKind,
    graceMs,
    dailyRate,
    curveExponent: ctx.curveExponent,
  };
}

/** Convierte días transcurridos post-gracia en días efectivos con curva suavizada/acelerada. */
export function applyForgettingCurve(rawDecayDays: number, curveExponent: number): number {
  if (rawDecayDays <= 0) return 0;
  return Math.pow(rawDecayDays, curveExponent);
}

/**
 * Calcula la pérdida acumulada de XP para un nodo desde su última práctica.
 * Motor principal de degradación diaria individual.
 */
export function computeNodeXpLoss(
  node: Pick<SkillNode, 'type' | 'slug' | 'name' | 'macroArea' | 'xp' | 'lastPracticeAt'>,
  user: User,
  now: Date = new Date()
): ForgettingSnapshot {
  const profile = buildNodeForgettingProfile(node, user);
  const xpBefore = Math.max(0, node.xp);

  if (!node.lastPracticeAt || xpBefore <= 0) {
    return emptySnapshot(profile, xpBefore);
  }

  const lastPracticeMs = new Date(node.lastPracticeAt).getTime();
  const elapsedMs = Math.max(0, now.getTime() - lastPracticeMs);

  if (elapsedMs <= profile.graceMs) {
    return {
      ...profileFields(profile),
      graceMs: profile.graceMs,
      elapsedMs,
      rawDecayDays: 0,
      effectiveDecayDays: 0,
      xpBefore,
      xpLoss: 0,
      retentionRatio: retentionDuringGrace(elapsedMs, profile.graceMs),
    };
  }

  const rawDecayDays = (elapsedMs - profile.graceMs) / MS_PER_DAY;
  const effectiveDecayDays = applyForgettingCurve(rawDecayDays, profile.curveExponent);
  const lossFraction = profile.dailyRate * effectiveDecayDays;
  const xpLoss = Math.min(xpBefore, Math.max(0, xpBefore * lossFraction));

  return {
    ...profileFields(profile),
    graceMs: profile.graceMs,
    elapsedMs,
    rawDecayDays,
    effectiveDecayDays,
    xpBefore,
    xpLoss,
    retentionRatio: computeRetentionRatioFromLoss(xpBefore, xpLoss, elapsedMs, profile.graceMs),
  };
}

/** Alias compatible con el motor de persistencia existente. */
export function computeDailyXpDecay(
  node: Pick<SkillNode, 'type' | 'slug' | 'name' | 'macroArea' | 'xp' | 'lastPracticeAt'>,
  user: User,
  now: Date = new Date()
): number {
  return computeNodeXpLoss(node, user, now).xpLoss;
}

/**
 * Ratio visual 0–1 para saturación del orbe (independiente de la UI que lo consuma).
 */
export function computeVisualRetentionRatio(
  node: Pick<SkillNode, 'type' | 'slug' | 'name' | 'macroArea' | 'xp' | 'lastPracticeAt'>,
  user: User,
  now: Date = new Date()
): number {
  return computeNodeXpLoss(node, user, now).retentionRatio;
}

export function getNodeGraceMs(
  node: Pick<SkillNode, 'type' | 'slug' | 'name' | 'macroArea'>,
  user: User
): number {
  return buildNodeForgettingProfile(node, user).graceMs;
}

function retentionDuringGrace(elapsedMs: number, graceMs: number): number {
  if (graceMs <= 0) return 1;
  const t = elapsedMs / graceMs;
  if (t <= 0.7) return 1;
  if (t >= 1) return 0.92;
  return 1 - ((t - 0.7) / 0.3) * 0.08;
}

function computeRetentionRatioFromLoss(
  xpBefore: number,
  xpLoss: number,
  elapsedMs: number,
  graceMs: number
): number {
  if (xpBefore <= 0) return 0.45;
  const xpRatio = (xpBefore - xpLoss) / xpBefore;
  const timeFade = Math.max(0.35, 1 - elapsedMs / (graceMs + 14 * MS_PER_DAY));
  return clamp(xpRatio * 0.65 + timeFade * 0.35, 0.08, 1);
}

function profileFields(profile: NodeForgettingProfile) {
  return {
    memoryKind: profile.memoryKind,
    dailyRate: profile.dailyRate,
    curveExponent: profile.curveExponent,
  };
}

function emptySnapshot(profile: NodeForgettingProfile, xpBefore: number): ForgettingSnapshot {
  return {
    ...profileFields(profile),
    graceMs: profile.graceMs,
    elapsedMs: 0,
    rawDecayDays: 0,
    effectiveDecayDays: 0,
    xpBefore,
    xpLoss: 0,
    retentionRatio: xpBefore > 0 ? 0.55 : 0.45,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Compatibilidad con DECAY_CONFIG legado (por tipo de nodo, no por memoria). */
export const LEGACY_DECAY_BY_NODE_TYPE = {
  intellectual: {
    graceMs: BASE_GRACE_MS.declarative,
    dailyDecayPercent: BASE_FORGETTING_RATES.declarative,
  },
  physical: {
    graceMs: PROCEDURAL_PHYSICAL_GRACE_MS,
    dailyDecayPercent: BASE_FORGETTING_RATES.procedural,
  },
} as const;
