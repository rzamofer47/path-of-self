import { MacroArea } from '@/src/types';

/** Clave alfabética: "area1_area2" (ordenadas alfabéticamente). */
export const COMPOUND_TITLE_MATRIX: Record<string, string> = {
  intellectual_mental_emotional: 'Sabio Interior',
  intellectual_productive: 'Alquimista Moderno',
  mental_emotional_physical: 'Guerrero Zen',
  mental_emotional_productive: 'Arquitecto del Equilibrio',
  physical_intellectual: 'Maestro de Armas',
  physical_productive: 'Alquimista, ex-Guerrero',
};

export function compoundTitleKey(a: MacroArea, b: MacroArea): string {
  return [a, b].sort().join('_');
}

export function lookupCompoundTitle(a: MacroArea, b: MacroArea): string | null {
  return COMPOUND_TITLE_MATRIX[compoundTitleKey(a, b)] ?? null;
}
