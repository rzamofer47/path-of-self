import { OnboardingAnswers } from '@/src/types';

export const PRACTICE_FREQUENCY_LABELS: Record<
  OnboardingAnswers['practiceFrequency'],
  string
> = {
  daily: 'Diariamente',
  weekly: 'Varias veces por semana',
  occasional: 'Ocasionalmente',
};

export const FOCUS_PREFERENCE_LABELS: Record<OnboardingAnswers['focusPreference'], string> = {
  physical: 'Física',
  intellectual: 'Intelectual',
  balanced: 'Equilibrio',
};

export const GOAL_TYPE_LABELS: Record<OnboardingAnswers['goalType'], string> = {
  mastery: 'Dominio profundo',
  maintenance: 'Mantenimiento constante',
  exploration: 'Exploración de áreas',
};
