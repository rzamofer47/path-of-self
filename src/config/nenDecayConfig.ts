export type DecayCategoria =
  | 'motor_explosivo'
  | 'motor_movilidad'
  | 'habito_diario'
  | 'cognitivo_filosofico'
  | 'tecnico_digital'
  | 'creativo_produccion';

export interface DecayCategoriaDef {
  label: string;
  descripcion: string;
  diasGracia: number;
  tasaSemanal: number;
  baseNeurociencia: string;
  /** Minutos mínimos para sesión parcial válida. */
  sesionMinima: number;
  /** Minutos para sesión completa (máximo XP). */
  sesionOptima: number;
  /** Minutos después de los cuales no hay ganancia adicional. */
  sesionMaxima: number;
  /** Veces por semana recomendadas. */
  frecuenciaSemanal: number;
}

export const DECAY_CATEGORIAS: Record<DecayCategoria, DecayCategoriaDef> = {
  motor_explosivo: {
    label: 'Físico / Explosivo',
    descripcion: 'Ejercicios de fuerza, técnicas marciales, movimientos de potencia',
    diasGracia: 4,
    tasaSemanal: 0.15,
    baseNeurociencia:
      'Desadaptación neuromuscular — pérdida de reclutamiento de unidades motoras de alto umbral',
    sesionMinima: 20,
    sesionOptima: 45,
    sesionMaxima: 90,
    frecuenciaSemanal: 4,
  },
  motor_movilidad: {
    label: 'Físico / Movilidad',
    descripcion: 'Fisioterapia, estiramientos, movilidad articular, caídas de Judo',
    diasGracia: 6,
    tasaSemanal: 0.08,
    baseNeurociencia:
      'Flexibilidad y propiocepción — decaimiento más lento que fuerza explosiva',
    sesionMinima: 10,
    sesionOptima: 20,
    sesionMaxima: 40,
    frecuenciaSemanal: 6,
  },
  habito_diario: {
    label: 'Hábito Diario',
    descripcion:
      'Rutinas que requieren práctica diaria: respiración, lectura matutina, Pomodoro',
    diasGracia: 2,
    tasaSemanal: 0.2,
    baseNeurociencia:
      'Circuito de hábito (cue-routine-reward) — requiere refuerzo frecuente para mantener el loop',
    sesionMinima: 5,
    sesionOptima: 10,
    sesionMaxima: 20,
    frecuenciaSemanal: 7,
  },
  cognitivo_filosofico: {
    label: 'Conocimiento / Filosofía',
    descripcion:
      'Lectura Estoica, psicología, distorsiones cognitivas, conceptos integrados',
    diasGracia: 14,
    tasaSemanal: 0.03,
    baseNeurociencia:
      'Memoria semántica declarativa — conocimiento integrado en redes conceptuales amplias',
    sesionMinima: 15,
    sesionOptima: 25,
    sesionMaxima: 45,
    frecuenciaSemanal: 4,
  },
  tecnico_digital: {
    label: 'Técnico / Digital',
    descripcion:
      'Programación, Supabase, React Native, flujos con IA, herramientas digitales',
    diasGracia: 5,
    tasaSemanal: 0.12,
    baseNeurociencia:
      'Memoria procedimental técnica — sintaxis decae más rápido que conceptos arquitectónicos',
    sesionMinima: 25,
    sesionOptima: 50,
    sesionMaxima: 90,
    frecuenciaSemanal: 5,
  },
  creativo_produccion: {
    label: 'Creativo / Producción',
    descripcion: 'Guiones, edición de video, generación de contenido, narración',
    diasGracia: 7,
    tasaSemanal: 0.1,
    baseNeurociencia:
      'Memoria procedimental creativa — flujo y criterio estético requieren práctica regular',
    sesionMinima: 30,
    sesionOptima: 60,
    sesionMaxima: 120,
    frecuenciaSemanal: 3,
  },
};

export const DECAY_CATEGORIA_ORDER: DecayCategoria[] = [
  'motor_explosivo',
  'motor_movilidad',
  'habito_diario',
  'cognitivo_filosofico',
  'tecnico_digital',
  'creativo_produccion',
];

export const DEFAULT_DECAY_CATEGORIA: DecayCategoria = 'habito_diario';
