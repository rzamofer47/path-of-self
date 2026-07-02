import * as Notifications from 'expo-notifications';

import { getCoolingAlertsEnabled } from '@/src/storage/localPrefs';
import { SkillNode, User } from '@/src/types';
import {
  getCheckWindowDays,
  getDecayState,
  getLastCheckDate,
  isVisualDecayTrackedNode,
} from '@/src/utils/visualDecay';

const PRACTICE_REMINDER_ID = 'practice-reminder-daily';
const DECAY_ALERT_PREFIX = 'decay-';
const LEGACY_DECAY_WARNING_PREFIX = 'decay-warning-';
const COOLING_GROUP_ID = 'cooling-group-alert';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function decayAlertId(nodeId: number): string {
  return `${DECAY_ALERT_PREFIX}${nodeId}`;
}

/** 9:00 del día en que vence la ventana de Check (3 o 5 días según fricción). */
export function computeDecayAlertDate(node: SkillNode, now: Date = new Date()): Date | null {
  const lastCheck = getLastCheckDate(node);
  if (!lastCheck) return null;

  const windowDays = getCheckWindowDays(node);
  const alertAt = new Date(lastCheck);
  alertAt.setDate(alertAt.getDate() + windowDays);
  alertAt.setHours(9, 0, 0, 0);

  if (alertAt.getTime() <= now.getTime()) return null;
  return alertAt;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function schedulePracticeReminder(hour: number): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(PRACTICE_REMINDER_ID);

  const granted = await requestNotificationPermission();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    identifier: PRACTICE_REMINDER_ID,
    content: {
      title: 'Path of Self — Hora de practicar',
      body: 'Tus habilidades se oxidan sin práctica. ¡Gana XP antes de que decaigan!',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute: 0,
    },
  });
}

export async function cancelPracticeReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(PRACTICE_REMINDER_ID);
}

export async function cancelDecayAlert(nodeId: number): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(decayAlertId(nodeId));
  await Notifications.cancelScheduledNotificationAsync(`${LEGACY_DECAY_WARNING_PREFIX}${nodeId}`);
}

/** @deprecated Use cancelDecayAlert */
export const cancelDecayWarning = cancelDecayAlert;

/** Programa alerta al vencer la ventana de Check (3d alta fricción / 5d pasiva). */
export async function scheduleDecayAlert(node: SkillNode): Promise<void> {
  if (!isVisualDecayTrackedNode(node) || node.id <= 0) return;

  await cancelDecayAlert(node.id);

  const alertAt = computeDecayAlertDate(node);
  if (!alertAt) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  const windowDays = getCheckWindowDays(node);

  await Notifications.scheduleNotificationAsync({
    identifier: decayAlertId(node.id),
    content: {
      title: '🔥 Habilidad enfriándose',
      body: `${node.name} lleva ${windowDays} días sin práctica`,
      data: { focusDecay: true, nodeIds: [node.id] },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: alertAt,
    },
  });

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log(
      `[DecayAlert] nodo ${node.id} "${node.name}": ${alertAt.toISOString()} (ventana ${windowDays}d)`
    );
  }
}

/** @deprecated Use scheduleDecayAlert */
export async function scheduleDecayWarning(node: SkillNode, _user?: User): Promise<void> {
  await scheduleDecayAlert(node);
}

/** Reprograma alertas por nodo para todos los hábitos con decay visual. */
export async function syncAllDecayWarnings(
  nodes: SkillNode[],
  _user?: User
): Promise<void> {
  for (const node of nodes) {
    if (isVisualDecayTrackedNode(node) && node.id > 0) {
      await scheduleDecayAlert(node);
    }
  }
}

function buildCoolingMessage(nodeNames: string[]): string {
  const count = nodeNames.length;
  if (count === 0) {
    return 'Algunas habilidades se están enfriando. ¿Volvemos hoy?';
  }
  const preview = nodeNames.slice(0, 3).join(', ');
  const suffix = count > 3 ? ` y ${count - 3} más` : '';
  return `${count} habilidad${count === 1 ? '' : 'es'} se están enfriando: ${preview}${suffix}. ¿Volvemos hoy?`;
}

function nextMorningAfter(date: Date): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  next.setHours(9, 0, 0, 0);
  return next;
}

/**
 * Fallback agrupado (máx. 1/día) para nodos ya en enfriamiento al abrir la app
 * o sin alerta individual programada (p. ej. tras reinstalar).
 */
export async function syncCoolingAlerts(
  nodes: SkillNode[],
  now: Date = new Date()
): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(COOLING_GROUP_ID);

  const enabled = await getCoolingAlertsEnabled();
  if (!enabled) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  const tracked = nodes.filter((node) => isVisualDecayTrackedNode(node) && node.id > 0);
  if (tracked.length === 0) return;

  const decaying = tracked.filter((node) => {
    const state = getDecayState(node, now);
    return state === 'cooling' || state === 'cold';
  });

  let triggerAt: Date | null = null;

  if (decaying.length > 0) {
    triggerAt = nextMorningAfter(now);
  } else {
    for (const node of tracked) {
      const alertAt = computeDecayAlertDate(node, now);
      if (!alertAt) continue;
      if (!triggerAt || alertAt < triggerAt) triggerAt = alertAt;
    }
  }

  if (!triggerAt) return;

  const focusNodes = decaying.length > 0 ? decaying : tracked;
  const nodeIds = focusNodes.map((node) => node.id);

  await Notifications.scheduleNotificationAsync({
    identifier: COOLING_GROUP_ID,
    content: {
      title: 'Path of Self — Enfriamiento',
      body: buildCoolingMessage(focusNodes.map((node) => node.name)),
      data: { focusDecay: true, nodeIds },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerAt,
    },
  });
}
