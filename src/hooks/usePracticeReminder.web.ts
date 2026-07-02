import { SkillNode, User } from '@/src/types';

export function decayAlertId(nodeId: number): string {
  return `decay-${nodeId}`;
}

export function computeDecayAlertDate(_node: SkillNode, _now?: Date): Date | null {
  return null;
}

export async function requestNotificationPermission(): Promise<boolean> {
  return false;
}

export async function schedulePracticeReminder(_hour: number): Promise<void> {}

export async function cancelPracticeReminder(): Promise<void> {}

export async function scheduleDecayAlert(_node: SkillNode): Promise<void> {}

export async function cancelDecayAlert(_nodeId: number): Promise<void> {}

export async function scheduleDecayWarning(_node: SkillNode, _user?: User): Promise<void> {}

export async function cancelDecayWarning(_nodeId: number): Promise<void> {}

export async function syncAllDecayWarnings(
  _nodes: SkillNode[],
  _user?: User
): Promise<void> {}

export async function syncCoolingAlerts(_nodes: SkillNode[]): Promise<void> {}
