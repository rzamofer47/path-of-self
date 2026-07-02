import { OnboardingAnswers, UserProfile } from '@/src/types';

export interface CalibrationResult {
  profile: UserProfile;
  xpGainModifier: number;
  decaySpeedModifier: number;
  retentionShield: boolean;
}

/**
 * Calibra XP y degradación según las 5 respuestas del test inicial (prompt.md §2).
 */
export function calibrateProfile(answers: OnboardingAnswers): CalibrationResult {
  let xpGainModifier = answers.ageRange === 'young' ? 1.15 : 1.0;
  let decaySpeedModifier = answers.ageRange === 'young' ? 1.2 : 1.0;
  let retentionShield = answers.ageRange === 'adult';

  switch (answers.practiceFrequency) {
    case 'daily':
      xpGainModifier *= 1.05;
      decaySpeedModifier *= 0.92;
      break;
    case 'occasional':
      decaySpeedModifier *= 1.18;
      break;
    default:
      break;
  }

  switch (answers.focusPreference) {
    case 'physical':
      xpGainModifier *= 1.03;
      break;
    case 'intellectual':
      retentionShield = retentionShield || answers.retentionConcern;
      break;
    case 'balanced':
      xpGainModifier *= 1.02;
      decaySpeedModifier *= 0.98;
      break;
  }

  if (answers.retentionConcern) {
    retentionShield = true;
    decaySpeedModifier *= 1.08;
  } else {
    decaySpeedModifier *= 0.95;
  }

  switch (answers.goalType) {
    case 'mastery':
      xpGainModifier *= 1.1;
      decaySpeedModifier *= 1.05;
      break;
    case 'maintenance':
      decaySpeedModifier *= 0.88;
      break;
    case 'exploration':
      xpGainModifier *= 1.08;
      decaySpeedModifier *= 1.1;
      break;
  }

  xpGainModifier = Math.round(xpGainModifier * 100) / 100;
  decaySpeedModifier = Math.round(decaySpeedModifier * 100) / 100;

  return {
    profile: answers.ageRange,
    xpGainModifier,
    decaySpeedModifier,
    retentionShield,
  };
}
