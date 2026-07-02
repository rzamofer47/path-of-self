import { SkillNode } from '@/src/types';

/** Fecha calendario local YYYY-MM-DD (sin hora). */
export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isSameLocalCalendarDay(a: Date, b: Date): boolean {
  return toLocalDateKey(a) === toLocalDateKey(b);
}

/** true si el nodo tiene verificación diaria registrada para hoy (hora local). */
export function isDailyVerifiedToday(
  node: Pick<SkillNode, 'dailyVerifiedAt'>,
  now: Date = new Date()
): boolean {
  if (!node.dailyVerifiedAt) return false;
  const verified = new Date(node.dailyVerifiedAt);
  if (Number.isNaN(verified.getTime())) return false;
  return isSameLocalCalendarDay(verified, now);
}
