import { CalidadSesion, SessionQualityEntry, SkillNode } from '@/src/types';
import { isDailyVerifiedToday, toLocalDateKey } from '@/src/utils/dailyVerification';

export function sessionXpMultiplier(calidad: CalidadSesion): number {
  return calidad === 'parcial' ? 0.5 : 1;
}

export function sessionQualityIcon(calidad: CalidadSesion): string {
  if (calidad === 'parcial') return '⚡';
  if (calidad === 'extendida') return '🔥';
  return '✓';
}

export function appendSessionQualityHistory(
  existing: SessionQualityEntry[] | null | undefined,
  calidad: CalidadSesion,
  date: Date = new Date()
): SessionQualityEntry[] {
  const fecha = toLocalDateKey(date);
  const filtered = (existing ?? []).filter((entry) => entry.fecha !== fecha);
  return [...filtered, { fecha, calidad }].slice(-7);
}

export function computeSesionesHoy(nodes: SkillNode[]): Record<CalidadSesion, number> {
  const acc: Record<CalidadSesion, number> = {
    parcial: 0,
    completa: 0,
    extendida: 0,
  };

  for (const node of nodes) {
    if (!isDailyVerifiedToday(node)) continue;
    acc[node.sessionQuality ?? 'completa'] += 1;
  }

  return acc;
}

const WEEKDAY_LABELS = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
] as const;

export function formatWeekdayFromDateKey(fecha: string): string {
  const parsed = new Date(`${fecha}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return fecha;
  return WEEKDAY_LABELS[parsed.getDay()] ?? fecha;
}

/** Etiqueta de día para historial; repite « anterior» si el mismo día ya apareció antes. */
export function formatHistoryDayLabel(
  fecha: string,
  olderEntries: SessionQualityEntry[]
): string {
  const weekday = formatWeekdayFromDateKey(fecha);
  const repeated = olderEntries.some(
    (entry) => formatWeekdayFromDateKey(entry.fecha) === weekday
  );
  return repeated ? `${weekday} anterior` : weekday;
}
