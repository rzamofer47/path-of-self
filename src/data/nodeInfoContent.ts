import { MacroArea } from '@/src/types';

export interface NodeInfoEntry {
  beneficio: string;
  comoHacerlo: string;
  gradoEstimado: string;
  linkRecurso?: string;
}

/** Entradas por slug de nodo específico. */
const BY_SLUG: Record<string, NodeInfoEntry> = {
  judo: {
    beneficio:
      'Desarrolla fuerza funcional, equilibrio y confianza corporal. Mejora la capacidad de reacción bajo presión.',
    comoHacerlo:
      'Empieza con 2 sesiones semanales de 45 min: calentamiento, caídas (ukemi) y una técnica básica. Busca un dojo o compañero de confianza.',
    gradoEstimado:
      'Practicando 2–3 veces/semana, alcanzarías Rango Intermedio en el área Física en ~8 semanas.',
    linkRecurso: 'https://www.youtube.com/results?search_query=judo+basics+for+beginners',
  },
  levantamiento_pesas: {
    beneficio:
      'Aumenta masa muscular, densidad ósea y metabolismo. Refuerza la disciplina y la constancia física.',
    comoHacerlo:
      'Semana 1: aprende sentadilla, peso muerto y press con barra vacía o mancuernas ligeras. 3 series × 8 repeticiones, 2 días/semana.',
    gradoEstimado:
      'Con 3 sesiones/semana durante 2 meses, subirías 2–3 niveles en el área Física.',
    linkRecurso: 'https://www.youtube.com/results?search_query=beginner+weightlifting+form',
  },
};

/** Fallback por macro-área cuando no hay entrada específica. */
export const MACRO_AREA_INFO: Record<MacroArea, NodeInfoEntry> = {
  physical: {
    beneficio:
      'Fortalece cuerpo y resistencia. Mejora energía diaria, postura y confianza en acciones concretas.',
    comoHacerlo:
      'Elige una actividad que puedas repetir 2 veces esta semana (caminata vigorosa, flexiones, deporte). Registra cada sesión con ✦.',
    gradoEstimado:
      '2 sesiones/semana sostenidas elevan tu rango Físico en ~4–6 semanas.',
  },
  intellectual: {
    beneficio:
      'Amplía tu capacidad analítica, memoria y velocidad de aprendizaje. Alimenta la curiosidad sistemática.',
    comoHacerlo:
      'Bloques de 25 min (Pomodoro) con un solo tema. Cierra cada bloque anotando una idea clave aprendida.',
    gradoEstimado:
      '30 min diarios de estudio enfocado suben tu rango Intelectual en ~3 semanas.',
  },
  mental_emotional: {
    beneficio:
      'Regula estrés, mejora autoconocimiento y estabilidad emocional. Base para decisiones más claras.',
    comoHacerlo:
      '5 minutos al despertar: respiración 4-7-8 o journaling de 3 líneas (qué siento, qué necesito, qué haré).',
    gradoEstimado:
      'Práctica diaria de 10 min eleva tu rango Mental/Emocional en ~5 semanas.',
  },
  productive: {
    beneficio:
      'Convierte intención en resultados. Mejora enfoque, priorización y entrega de proyectos personales.',
    comoHacerlo:
      'Define 1 tarea concreta para hoy (≤ 45 min). Elimina distracciones y marca ✦ al completarla.',
    gradoEstimado:
      'Una tarea significativa por día durante 3 semanas sube tu rango Productivo notablemente.',
  },
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

export function resolveNodeInfo(
  slug: string | null,
  name: string,
  macroArea: MacroArea
): NodeInfoEntry {
  if (slug && BY_SLUG[slug]) return BY_SLUG[slug];

  const byName = slugify(name);
  if (BY_SLUG[byName]) return BY_SLUG[byName];

  return MACRO_AREA_INFO[macroArea];
}
