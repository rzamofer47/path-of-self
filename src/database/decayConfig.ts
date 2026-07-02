import { MacroArea, User } from '@/src/types';
import type { VertienteId } from '@/src/config/nenConfig';
import {
  computeDailyXpDecay,
  getNodeGraceMs,
  LEGACY_DECAY_BY_NODE_TYPE,
} from '@/src/utils/forgettingEngine';

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/** Categoría de fricción del hábito para el decay visual por Check. */
export type CheckFrictionCategory = 'high' | 'passive';

/** Días sin Check antes de que empiece el enfriamiento visual. */
export const CHECK_DECAY_WINDOW_DAYS: Record<CheckFrictionCategory, number> = {
  /** Gimnasio, Judo, Enfoque/Pomodoro y vertientes similares. */
  high: 3,
  /** Lectura, fisioterapia, regulación nerviosa y mantenimiento pasivo. */
  passive: 5,
};

/**
 * Ventana de Check por vertiente — declaración explícita, fácil de ajustar.
 * Alta fricción: 3 días | Pasiva: 5 días.
 */
export const VERTIENTE_CHECK_FRICTION: Record<VertienteId, CheckFrictionCategory> = {
  gimnasio: 'high',
  judo: 'high',
  enfoque: 'high',
  coding: 'high',
  writing: 'high',
  design: 'high',
  lectura: 'passive',
  fisioterapia: 'passive',
  nervioso: 'passive',
  guitar: 'passive',
  piano: 'passive',
  language: 'passive',
};

/** Fallback para nodos custom sin slug de vertiente reconocible. */
export const MACRO_AREA_CHECK_FRICTION: Record<MacroArea, CheckFrictionCategory> = {
  physical: 'high',
  productive: 'high',
  mental_emotional: 'passive',
  intellectual: 'passive',
};

export const DEFAULT_CHECK_FRICTION: CheckFrictionCategory = 'passive';

/** Brillo mínimo del aura en estado `cold` (0–1). */
export const VISUAL_DECAY_MIN_FRESHNESS = 0.22;

/** @deprecated Preferir BASE_FORGETTING_RATES en forgettingEngine. */
export const DECAY_CONFIG = {
  intellectual: {
    graceMs: LEGACY_DECAY_BY_NODE_TYPE.intellectual.graceMs,
    dailyDecayPercent: LEGACY_DECAY_BY_NODE_TYPE.intellectual.dailyDecayPercent,
  },
  physical: {
    graceMs: LEGACY_DECAY_BY_NODE_TYPE.physical.graceMs,
    dailyDecayPercent: LEGACY_DECAY_BY_NODE_TYPE.physical.dailyDecayPercent,
    maxWeeklySessions: 4,
  },
} as const;

export function getWeekStart(now: Date): string {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString();
}

export function isSameWeek(weekStart: string | null, now: Date): boolean {
  if (!weekStart) return false;
  return weekStart === getWeekStart(now);
}

export function getGraceMs(
  node: { type: 'intellectual' | 'physical'; slug?: string | null; name?: string; macroArea?: string },
  user: User
): number {
  if (node.slug !== undefined && node.name !== undefined && node.macroArea) {
    return getNodeGraceMs(
      {
        type: node.type,
        slug: node.slug ?? null,
        name: node.name,
        macroArea: node.macroArea as import('@/src/types').MacroArea,
      },
      user
    );
  }
  let graceMs = DECAY_CONFIG[node.type].graceMs;
  if (user.retentionShield) graceMs *= 2;
  return graceMs;
}

export function calculateDecayForNode(
  node: {
    type: 'intellectual' | 'physical';
    slug?: string | null;
    name?: string;
    macroArea?: string;
    xp: number;
    lastPracticeAt: string | null;
  },
  user: User,
  now: Date = new Date()
): number {
  if (!node.lastPracticeAt) return 0;

  if (node.slug !== undefined && node.name !== undefined && node.macroArea) {
    return computeDailyXpDecay(
      {
        type: node.type,
        slug: node.slug ?? null,
        name: node.name,
        macroArea: node.macroArea as import('@/src/types').MacroArea,
        xp: node.xp,
        lastPracticeAt: node.lastPracticeAt,
      },
      user,
      now
    );
  }

  const graceMs = getGraceMs(node, user);
  const lastPractice = new Date(node.lastPracticeAt).getTime();
  const elapsed = now.getTime() - lastPractice;
  if (elapsed <= graceMs) return 0;

  const decayDays = (elapsed - graceMs) / MS_PER_DAY;
  const decayPercent =
    DECAY_CONFIG[node.type].dailyDecayPercent * decayDays * user.decaySpeedModifier;
  return Math.min(node.xp, Math.max(0, node.xp * decayPercent));
}

export { levelFromXp, xpInCurrentLevel, PROGRESION_CONFIG, XP_MAXIMO_POR_NODO } from '@/src/config/progressionConfig';
