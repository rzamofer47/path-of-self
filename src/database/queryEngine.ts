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

const engine = isSupabaseEnabled() ? supabaseEngine : localEngine;

export async function loadSmoothedNenProfile(): Promise<import('@/src/config/nenConfig').NenProfile> {
  const nodes = await engine.getAllNodes();
  return loadSmoothedNenProfileInternal(nodes);
}

export { triggerXPFeedback, subscribeXpFeedback } from '@/src/utils/xpFeedback';
export type { XpFeedbackPayload, XpFeedbackEventType } from '@/src/utils/xpFeedback';

export const getUser = engine.getUser;
export const completeOnboarding = engine.completeOnboarding;
export const updateSelectedSkin = engine.updateSelectedSkin;
export const updateTreeViewMode = engine.updateTreeViewMode;
export const updatePracticeReminder = engine.updatePracticeReminder;
export const updateNodePosition = engine.updateNodePosition;
export const resetTestMode = localEngine.resetTestMode;
export const getAllNodes = engine.getAllNodes;

export async function getDisplayNodes(): Promise<SkillNode[]> {
  const dbNodes = await engine.getAllNodes();
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
  const dbNodes = await engine.getAllNodes();
  return dbNodes.filter((node) => node.isDeleted);
}

export const getSuggestedGuideNodes = localEngine.getSuggestedGuideNodes;
export const getDormantShadowNodes = localEngine.getDormantShadowNodes;
export const getLockedCatalogNodes = localEngine.getLockedCatalogNodes;
export const createCustomNode = engine.createCustomNode;
export const banishNodeToUnderworld = engine.banishNodeToUnderworld;
export const softDeleteNode = engine.softDeleteNode;
export const restoreDeletedNode = engine.restoreDeletedNode;
export const deleteCustomNode = engine.deleteCustomNode;
export const reactivateNode = engine.reactivateNode;
export const configureWildcardNode = engine.configureWildcardNode;

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

export const setDailyVerification = localEngine.setDailyVerification;
export const getNodeStreakStatsForNode = localEngine.getNodeStreakStatsForNode;
export { syncProgressNow, mergeProgressOnOpen, pushProgressToCloud, verifySupabaseBackupSchema } from '@/src/database/sync/progressSync';
export { shareProgressExport } from '@/src/database/sync/progressExport';
export const applyDecayToAllNodes = engine.applyDecayToAllNodes;
export const getAreaLevels = engine.getAreaLevels;
export const getRecentHistory = engine.getRecentHistory;
