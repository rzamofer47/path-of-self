import { MacroArea, NodeType } from '@/src/types';

export interface GuideSuggestion {
  slug: string;
  name: string;
  type: NodeType;
  macroArea: MacroArea;
  beneficio: string;
  comoHacerlo: string;
  guideUrl?: string;
}

export const GUIDE_SUGGESTIONS: Record<MacroArea, GuideSuggestion[]> = {
  physical: [],
  intellectual: [
    {
      slug: 'guide_lectura',
      name: 'Lectura profunda',
      type: 'intellectual',
      macroArea: 'intellectual',
      beneficio: 'Vocabulario, pensamiento crítico y acumulación de ideas aplicables.',
      comoHacerlo: '25 min con un solo libro; subraya una frase que quieras recordar.',
    },
    {
      slug: 'guide_idioma',
      name: 'Práctica de idioma',
      type: 'intellectual',
      macroArea: 'intellectual',
      beneficio: 'Plasticidad cognitiva y apertura cultural.',
      comoHacerlo: '15 min diarios en app o flashcards; repite en voz alta 5 frases nuevas.',
      guideUrl: 'https://www.youtube.com/results?search_query=language+learning+daily+routine',
    },
  ],
  mental_emotional: [],
  productive: [
    {
      slug: 'guide_pomodoro',
      name: 'Bloques Pomodoro',
      type: 'intellectual',
      macroArea: 'productive',
      beneficio: 'Enfoque sostenido y entrega de tareas sin agotamiento.',
      comoHacerlo: '25 min trabajo + 5 min pausa. Una sola tarea por bloque, sin multitarea.',
    },
    {
      slug: 'guide_revision',
      name: 'Revisión semanal',
      type: 'intellectual',
      macroArea: 'productive',
      beneficio: 'Alinea prioridades, cierra pendientes y planifica la semana siguiente.',
      comoHacerlo: 'Domingo 20 min: lista logros, pendientes y 3 prioridades para la semana.',
    },
  ],
};
