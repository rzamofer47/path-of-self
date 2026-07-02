import { getStorageMode, isSupabaseEnabled } from '@/src/config/env';
import { SkillNode, User } from '@/src/types';

import * as localEngine from './queryEngine.local';
import * as supabaseEngine from './queryEngine.supabase';
import { getSmoothedNenProfile as loadSmoothedNenProfileInternal } from './nenHistory';
import { layoutShadowLayer } from '@/src/utils/shadowRadialRepulsion';
import { inferXpFeedbackEvent, type XpFeedbackPayload } from '@/src/utils/xpFeedback';

export { DECAY_CONFIG, calculateDecayForNode } from './decayConfig';
export {
  getDecayState,
  computeVisualFreshnessRatio,
  formatLastCheckLabel,
  isVisualDecayTrackedNode,
  type VisualDecayState,
} from '@/src/utils/visualDecay';
export {
  classifyMemoryKind,
  computeNodeXpLoss,
  computeVisualRetentionRatio,
  buildForgettingContext,
  buildNodeForgettingProfile,
  type MemoryKind,
  type ForgettingSnapshot,
} from '@/src/utils/forgettingEngine';
export { getPersistenceBackend, type PersistenceBackend } from './persistence';
export { clearShadowLayoutCache } from '@/src/utils/shadowRadialRepulsion';
export { getStorageMode, isSupabaseEnabled };

type QueryEngine = typeof localEngine | typeof supabaseEngine;

function getEngine(): QueryEngine {
  return isSupabaseEnabled() ? supabaseEngine : localEngine;
}

export async function loadSmoothedNenProfile(): Promise<import('@/src/config/nenConfig').NenProfile> {
  const nodes = await getEngine().getAllNodes();
  return loadSmoothedNenProfileInternal(nodes);
}

export { triggerXPFeedback, subscribeXpFeedback } from '@/src/utils/xpFeedback';
export type { XpFeedbackPayload, XpFeedbackEventType } from '@/src/utils/xpFeedback';

export async function getUser(): Promise<User | null> {
  return getEngine().getUser();
}

export async function completeOnboarding(
  answers: Parameters<typeof localEngine.completeOnboarding>[0]
): Promise<User> {
  return getEngine().completeOnboarding(answers);
}

export async function updateSelectedSkin(skinId: Parameters<typeof localEngine.updateSelectedSkin>[0]) {
  return getEngine().updateSelectedSkin(skinId);
}

export async function updateTreeViewMode(mode: Parameters<typeof localEngine.updateTreeViewMode>[0]) {
  return getEngine().updateTreeViewMode(mode);
}

export async function updatePracticeReminder(
  enabled: Parameters<typeof localEngine.updatePracticeReminder>[0],
  hour: Parameters<typeof localEngine.updatePracticeReminder>[1]
) {
  return getEngine().updatePracticeReminder(enabled, hour);
}

export async function updateNodePosition(
  nodeId: Parameters<typeof localEngine.updateNodePosition>[0],
  posX: Parameters<typeof localEngine.updateNodePosition>[1],
  posY: Parameters<typeof localEngine.updateNodePosition>[2]
) {
  return getEngine().updateNodePosition(nodeId, posX, posY);
}

export async function updateNodeName(
  ...args: Parameters<typeof localEngine.updateNodeName>
) {
  return getEngine().updateNodeName(...args);
}

export const resetTestMode = localEngine.resetTestMode;

/** Marca el onboarding en local y, si hay sesión, en el perfil de Supabase. */
export async function markOnboardingComplete(): Promise<void> {
  await localEngine.markOnboardingComplete();
  if (isSupabaseEnabled()) {
    await supabaseEngine.markOnboardingComplete();
  }
}

export async function getAllNodes(): Promise<SkillNode[]> {
  return getEngine().getAllNodes();
}

export async function getDisplayNodes(): Promise<SkillNode[]> {
  const dbNodes = await getEngine().getAllNodes();
  const lockedBackground = localEngine.getLockedCatalogNodes(dbNodes);
  const surface = dbNodes.filter(
    (n) => n.layer !== 'dormant' && n.layer !== 'locked' && !n.isDeleted
  );
  const shadowBaseline = [
    ...localEngine.getDormantShadowNodes(dbNodes),
    ...localEngine.getSuggestedGuideNodes(dbNodes),
  ];
  const shadow = layoutShadowLayer(surface, shadowBaseline);
  return [...lockedBackground, ...surface, ...shadow];
}

/** Recarga usuario y nodos desde el almacenamiento permanente (SQLite / localStorage / cloud). */
export async function loadPersistedTree(): Promise<{
  user: User | null;
  nodes: SkillNode[];
}> {
  const user = await getUser();
  if (!user) {
    return { user: null, nodes: [] };
  }
  const nodes = await getDisplayNodes();
  return { user, nodes };
}

export async function getDeletedNodes(): Promise<SkillNode[]> {
  const dbNodes = await getEngine().getAllNodes();
  return dbNodes.filter((node) => node.isDeleted);
}

export const getSuggestedGuideNodes = localEngine.getSuggestedGuideNodes;
export const getDormantShadowNodes = localEngine.getDormantShadowNodes;
export const getLockedCatalogNodes = localEngine.getLockedCatalogNodes;

export async function createCustomNode(
  ...args: Parameters<typeof localEngine.createCustomNode>
) {
  return getEngine().createCustomNode(...args);
}

export async function banishNodeToUnderworld(
  ...args: Parameters<typeof localEngine.banishNodeToUnderworld>
) {
  return getEngine().banishNodeToUnderworld(...args);
}

export async function softDeleteNode(...args: Parameters<typeof localEngine.softDeleteNode>) {
  return getEngine().softDeleteNode(...args);
}

export async function restoreDeletedNode(...args: Parameters<typeof localEngine.restoreDeletedNode>) {
  return getEngine().restoreDeletedNode(...args);
}

export async function deleteCustomNode(...args: Parameters<typeof localEngine.deleteCustomNode>) {
  return getEngine().deleteCustomNode(...args);
}

export async function reactivateNode(...args: Parameters<typeof localEngine.reactivateNode>) {
  return getEngine().reactivateNode(...args);
}

export async function configureWildcardNode(
  ...args: Parameters<typeof localEngine.configureWildcardNode>
) {
  return getEngine().configureWildcardNode(...args);
}

export async function addXpToNode(
  nodeId: number,
  baseXp: number,
  user: User
): Promise<{
  success: boolean;
  message?: string;
  node?: SkillNode;
  feedback?: XpFeedbackPayload;
}> {
  const engine = getEngine();
  const beforeNodes = await engine.getAllNodes();
  const prevLevel = beforeNodes.find((node) => node.id === nodeId)?.level ?? 0;
  const result = await engine.addXpToNode(nodeId, baseXp, user);
  if (!result.success || !result.node) return result;

  if ('feedback' in result && result.feedback != null) {
    return { ...result, feedback: result.feedback as XpFeedbackPayload };
  }

  const allNodes = await engine.getAllNodes();
  return {
    ...result,
    feedback: inferXpFeedbackEvent(prevLevel, result.node, allNodes),
  };
}

export async function setDailyVerification(
  nodeId: number,
  calidad: Parameters<typeof localEngine.setDailyVerification>[1] = 'completa',
  user?: Parameters<typeof localEngine.setDailyVerification>[2]
) {
  return getEngine().setDailyVerification(nodeId, calidad, user);
}

export const getNodeStreakStatsForNode = localEngine.getNodeStreakStatsForNode;
export {
  syncProgressNow,
  mergeProgressOnOpen,
  pushProgressToCloud,
  clearCloudProgressForCurrentUser,
  verifySupabaseBackupSchema,
} from '@/src/database/sync/progressSync';
export { shareProgressExport } from '@/src/database/sync/progressExport';

export async function applyDecayToAllNodes(user: User) {
  return getEngine().applyDecayToAllNodes(user);
}

export async function getAreaLevels() {
  return getEngine().getAreaLevels();
}

export async function getRecentHistory(limit?: number) {
  return getEngine().getRecentHistory(limit);
}
