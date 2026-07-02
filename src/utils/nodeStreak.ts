import type { CheckFrictionCategory } from '@/src/database/decayConfig';
import { calendarDaysSince } from '@/src/utils/visualDecay';

/** Días calendario máximos entre checks consecutivos dentro de una racha. */
export function maxCalendarGapForFriction(friction: CheckFrictionCategory): number {
  return friction === 'high' ? 1 : 2;
}

/** Días sin check permitidos antes de romper la racha activa. */
export function maxDaysWithoutCheckForFriction(friction: CheckFrictionCategory): number {
  return friction === 'high' ? 1 : 2;
}

function toDateKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

/** Fechas únicas de check ordenadas de más antigua a más reciente. */
export function uniqueSortedCheckDates(timestamps: string[]): Date[] {
  const keys = new Set<string>();
  for (const ts of timestamps) {
    const parsed = new Date(ts);
    if (Number.isNaN(parsed.getTime())) continue;
    keys.add(toDateKey(parsed));
  }
  return [...keys]
    .sort()
    .map((key) => {
      const d = new Date(`${key}T12:00:00`);
      d.setHours(0, 0, 0, 0);
      return d;
    });
}

export interface NodeStreakStats {
  currentStreak: number;
  maxStreak: number;
  lastCheckDaysAgo: number | null;
}

/**
 * Calcula racha actual y máxima a partir del log de checks.
 * `timestamps` — filas `history_logs` con action `daily_check` (o fechas ISO).
 */
export function computeNodeStreakStats(
  timestamps: string[],
  friction: CheckFrictionCategory,
  now: Date = new Date()
): NodeStreakStats {
  const dates = uniqueSortedCheckDates(timestamps);
  if (dates.length === 0) {
    return { currentStreak: 0, maxStreak: 0, lastCheckDaysAgo: null };
  }

  const maxGap = maxCalendarGapForFriction(friction);
  const lastCheck = dates[dates.length - 1];
  const lastCheckDaysAgo = calendarDaysSince(lastCheck, now);

  let maxStreak = 0;
  let run = 1;

  for (let i = 1; i < dates.length; i++) {
    const gap = calendarDaysSince(dates[i - 1], dates[i]);
    if (gap <= maxGap) {
      run += 1;
    } else {
      maxStreak = Math.max(maxStreak, run);
      run = 1;
    }
  }
  maxStreak = Math.max(maxStreak, run);

  const grace = maxDaysWithoutCheckForFriction(friction);
  if (lastCheckDaysAgo > grace) {
    return { currentStreak: 0, maxStreak, lastCheckDaysAgo };
  }

  let currentStreak = 1;
  for (let i = dates.length - 2; i >= 0; i--) {
    const gap = calendarDaysSince(dates[i], dates[i + 1]);
    if (gap <= maxGap) {
      currentStreak += 1;
    } else {
      break;
    }
  }

  return { currentStreak, maxStreak, lastCheckDaysAgo };
}

export function formatStreakLastCheckLabel(daysAgo: number | null): string {
  if (daysAgo == null) return 'sin registros';
  if (daysAgo === 0) return 'hoy';
  if (daysAgo === 1) return 'hace 1 día';
  return `hace ${daysAgo} días`;
}
