import { NEN_ACTIVE_MIN_LEVEL, resolveVertienteId } from '@/src/config/nenConfig';
import {
  CHECK_DECAY_WINDOW_DAYS,
  DEFAULT_CHECK_FRICTION,
  MACRO_AREA_CHECK_FRICTION,
  VERTIENTE_CHECK_FRICTION,
  VISUAL_DECAY_MIN_FRESHNESS,
  type CheckFrictionCategory,
} from '@/src/database/decayConfig';
import { SkillNode } from '@/src/types';
import { isDailyVerifiedToday } from '@/src/utils/dailyVerification';
import { isRootLayer } from '@/src/utils/nodeColors';

const MS_DAY = 24 * 60 * 60 * 1000;

export type VisualDecayState = 'fresh' | 'cooling' | 'cold';

export function getLastCheckDate(node: Pick<SkillNode, 'dailyVerifiedAt'>): Date | null {
  if (!node.dailyVerifiedAt) return null;
  const parsed = new Date(node.dailyVerifiedAt);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Días calendario locales transcurridos desde `from` hasta `to` (0 = mismo día). */
export function calendarDaysSince(from: Date, to: Date): number {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / MS_DAY));
}

export function getCheckFrictionCategory(node: SkillNode): CheckFrictionCategory {
  const vertiente = resolveVertienteId(node);
  if (vertiente) return VERTIENTE_CHECK_FRICTION[vertiente];
  return MACRO_AREA_CHECK_FRICTION[node.macroArea] ?? DEFAULT_CHECK_FRICTION;
}

export function getCheckWindowDays(node: SkillNode): number {
  return CHECK_DECAY_WINDOW_DAYS[getCheckFrictionCategory(node)];
}

/** Nodos activos (nivel >= 1) que muestran decay visual por Check. */
export function isVisualDecayTrackedNode(node: SkillNode): boolean {
  if (node.isDeleted) return false;
  if (node.id < 0 || node.layer === 'dormant' || node.layer === 'wildcard') return false;
  if (isRootLayer(node)) return false;
  return node.level >= NEN_ACTIVE_MIN_LEVEL;
}

/**
 * Estado de frescura visual según el último Check y la ventana de la vertiente.
 * Calculado al vuelo — no persiste ni modifica XP/nivel.
 */
export function getDecayState(node: SkillNode, now: Date = new Date()): VisualDecayState {
  if (!isVisualDecayTrackedNode(node)) return 'fresh';
  if (isDailyVerifiedToday(node, now)) return 'fresh';

  const lastCheck = getLastCheckDate(node);
  if (!lastCheck) return 'cold';

  const days = calendarDaysSince(lastCheck, now);
  const windowDays = getCheckWindowDays(node);

  if (days <= windowDays) return 'fresh';
  if (days <= windowDays * 2) return 'cooling';
  return 'cold';
}

/**
 * Ratio de brillo del aura (1 = color pleno, ~0.22 = cenizo).
 * Check de hoy → 1 instantáneo, sin transición lenta.
 */
export function computeVisualFreshnessRatio(node: SkillNode, now: Date = new Date()): number {
  if (!isVisualDecayTrackedNode(node)) return 1;
  if (isDailyVerifiedToday(node, now)) return 1;

  const state = getDecayState(node, now);
  if (state === 'fresh') return 1;
  if (state === 'cold') return VISUAL_DECAY_MIN_FRESHNESS;

  const lastCheck = getLastCheckDate(node);
  if (!lastCheck) return VISUAL_DECAY_MIN_FRESHNESS;

  const windowDays = getCheckWindowDays(node);
  const days = calendarDaysSince(lastCheck, now);
  const progress = (days - windowDays) / windowDays;
  return 1 - progress * (1 - VISUAL_DECAY_MIN_FRESHNESS);
}

/** Etiqueta neutral para el panel de información. */
export function formatLastCheckLabel(node: SkillNode, now: Date = new Date()): string {
  if (!isVisualDecayTrackedNode(node)) return '—';

  const lastCheck = getLastCheckDate(node);
  if (!lastCheck) return 'Sin Check registrado';
  if (isDailyVerifiedToday(node, now)) return 'Check de hoy';

  const days = calendarDaysSince(lastCheck, now);
  if (days === 1) return 'hace 1 día';
  return `hace ${days} días`;
}

export function daysSinceLastCheck(node: SkillNode, now: Date = new Date()): number | null {
  if (!isVisualDecayTrackedNode(node)) return null;
  const lastCheck = getLastCheckDate(node);
  if (!lastCheck) return null;
  if (isDailyVerifiedToday(node, now)) return 0;
  return calendarDaysSince(lastCheck, now);
}
