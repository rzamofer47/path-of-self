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
  intellectual: [],
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
