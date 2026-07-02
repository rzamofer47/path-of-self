import { OnboardingAnswers } from '@/src/types';

import {
  FOCUS_PREFERENCE_LABELS,
  GOAL_TYPE_LABELS,
  PRACTICE_FREQUENCY_LABELS,
} from './onboardingLabels';

/** Resumen legible del test inicial (reglas simples, sin IA). */
export function generateProfileSummary(answers: OnboardingAnswers): string {
  const age =
    answers.ageRange === 'young'
      ? 'Perfil Joven — aprendizaje rápido, mayor sensibilidad al abandono'
      : 'Perfil Adulto — ritmo sostenido con escudo de retención';

  let discipline = 'disciplina equilibrada';
  if (answers.practiceFrequency === 'daily') {
    discipline = 'alta disciplina y constancia diaria';
  } else if (answers.practiceFrequency === 'occasional') {
    discipline = 'baja tolerancia a rutina fija — necesita recordatorios';
  }

  const focus = FOCUS_PREFERENCE_LABELS[answers.focusPreference].toLowerCase();
  const goal = GOAL_TYPE_LABELS[answers.goalType].toLowerCase();
  const retention = answers.retentionConcern
    ? 'preocupación alta por olvidar lo aprendido'
    : 'retención estable con práctica regular';

  return `${age}. Enfoque ${focus}, ${discipline}. Objetivo: ${goal}. ${retention.charAt(0).toUpperCase()}${retention.slice(1)}.`;
}
