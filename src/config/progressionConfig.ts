/**
 * Calibración de progresión por nodo (6 generaciones = nivel máximo 6).
 * 6 subidas de ~10 XP → nivel 6 (60 XP total por nodo).
 */
export const PROGRESION_CONFIG = {
  xpPorNivel: 10,
  nivelMaximoPorNodo: 6,
  xpMaximoPorNodo: 60,
} as const;

export const XP_MAXIMO_POR_NODO = PROGRESION_CONFIG.xpMaximoPorNodo;

/** XP otorgado por sesión / check de práctica estándar. */
export const XP_PER_SESSION = PROGRESION_CONFIG.xpPorNivel;

/** XP acumulado dentro del nivel actual (0 … xpPorNivel-1). */
export function xpInCurrentLevel(xp: number): number {
  const capped = Math.min(xp, XP_MAXIMO_POR_NODO);
  if (capped >= XP_MAXIMO_POR_NODO) return 0;
  return capped % PROGRESION_CONFIG.xpPorNivel;
}

/** Nivel 1 … nivelMaximoPorNodo a partir del XP total. */
export function levelFromXp(xp: number): number {
  const { xpPorNivel, nivelMaximoPorNodo } = PROGRESION_CONFIG;
  const raw = Math.max(1, Math.floor(xp / xpPorNivel) + 1);
  return Math.min(nivelMaximoPorNodo, raw);
}

/** XP que cuenta hacia el progreso global (tope por nodo). */
export function xpTowardGlobalCap(xp: number): number {
  return Math.min(Math.max(0, xp), XP_MAXIMO_POR_NODO);
}
