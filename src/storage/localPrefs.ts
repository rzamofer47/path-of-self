import AsyncStorage from '@react-native-async-storage/async-storage';
import { NenAxisId } from '@/src/config/nenConfig';

const TUTORIAL_COMPLETED_KEY = '@path-of-self/tutorial-completed';
const SKIP_ONBOARDING_AFTER_FULL_RESET_KEY = '@path-of-self/skip-onboarding-after-full-reset';
const AUTO_FOCUS_MAP_KEY = '@path-of-self/auto-focus-map';
const COOLING_ALERTS_KEY = '@path-of-self/cooling-alerts-enabled';
const NEN_CELEBRATED_PEAKS_KEY = '@path-of-self/nen-celebrated-peaks';
const LAST_OPEN_DATE_KEY = '@path-of-self/last-open-date';

function todayDateKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export async function getLastOpenDate(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_OPEN_DATE_KEY);
}

export async function markOpenedToday(now = new Date()): Promise<void> {
  await AsyncStorage.setItem(LAST_OPEN_DATE_KEY, todayDateKey(now));
}

export async function shouldShowDailySummary(now = new Date()): Promise<boolean> {
  const last = await getLastOpenDate();
  return last !== todayDateKey(now);
}

export async function getCoolingAlertsEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(COOLING_ALERTS_KEY);
  if (value == null) return true;
  return value === '1';
}

export async function setCoolingAlertsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(COOLING_ALERTS_KEY, enabled ? '1' : '0');
}

export type NenCelebratedPeaks = Partial<Record<NenAxisId, number>>;

export async function getCelebratedNenPeaks(): Promise<NenCelebratedPeaks> {
  const raw = await AsyncStorage.getItem(NEN_CELEBRATED_PEAKS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as NenCelebratedPeaks;
  } catch {
    return {};
  }
}

export async function setCelebratedNenPeak(axisId: NenAxisId, value: number): Promise<void> {
  const peaks = await getCelebratedNenPeaks();
  peaks[axisId] = value;
  await AsyncStorage.setItem(NEN_CELEBRATED_PEAKS_KEY, JSON.stringify(peaks));
}

export async function isTutorialCompleted(): Promise<boolean> {
  const value = await AsyncStorage.getItem(TUTORIAL_COMPLETED_KEY);
  return value === '1';
}

export async function setTutorialCompleted(completed: boolean): Promise<void> {
  await AsyncStorage.setItem(TUTORIAL_COMPLETED_KEY, completed ? '1' : '0');
}

export async function setSkipOnboardingAfterFullReset(enabled: boolean): Promise<void> {
  if (enabled) {
    await AsyncStorage.setItem(SKIP_ONBOARDING_AFTER_FULL_RESET_KEY, '1');
  } else {
    await AsyncStorage.removeItem(SKIP_ONBOARDING_AFTER_FULL_RESET_KEY);
  }
}

export async function consumeSkipOnboardingAfterFullReset(): Promise<boolean> {
  const value = await AsyncStorage.getItem(SKIP_ONBOARDING_AFTER_FULL_RESET_KEY);
  if (value !== '1') return false;
  await AsyncStorage.removeItem(SKIP_ONBOARDING_AFTER_FULL_RESET_KEY);
  return true;
}

export async function isSkipOnboardingAfterFullReset(): Promise<boolean> {
  const value = await AsyncStorage.getItem(SKIP_ONBOARDING_AFTER_FULL_RESET_KEY);
  return value === '1';
}

export async function consumeAutoFocusMap(): Promise<boolean> {
  const value = await AsyncStorage.getItem(AUTO_FOCUS_MAP_KEY);
  if (value !== '1') return false;
  await AsyncStorage.removeItem(AUTO_FOCUS_MAP_KEY);
  return true;
}

export async function requestAutoFocusMap(): Promise<void> {
  await AsyncStorage.setItem(AUTO_FOCUS_MAP_KEY, '1');
}
