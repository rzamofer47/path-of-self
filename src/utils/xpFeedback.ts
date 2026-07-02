import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import {
  getGenerationPeerSlugs,
  isCriticalCatalogSlug,
  isGenerationCompleteForNodes,
} from '@/src/data/catalogNodeIndex';

export type XpFeedbackEventType = 'levelUp' | 'generationComplete' | 'criticalMilestone';

export interface XpFeedbackPayload {
  eventType: XpFeedbackEventType;
  connectedNodeIds?: number[];
  sourceNodeId?: number;
}

type XpFeedbackListener = (payload: XpFeedbackPayload) => void;

const listeners = new Set<XpFeedbackListener>();

export function subscribeXpFeedback(listener: XpFeedbackListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function triggerXPFeedback(payload: XpFeedbackPayload): void {
  if (payload.eventType === 'criticalMilestone') {
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  } else if (payload.eventType === 'generationComplete' && Platform.OS !== 'web') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  listeners.forEach((listener) => listener(payload));
}

export function inferXpFeedbackEvent(
  prevLevel: number,
  updatedNode: {
    id: number;
    slug: string | null;
    level: number;
    xp: number;
    lastPracticeAt: string | null;
  },
  allNodes: {
    id: number;
    slug: string | null;
    level: number;
    xp: number;
    lastPracticeAt: string | null;
  }[]
): XpFeedbackPayload {
  const merged = allNodes.map((node) => (node.id === updatedNode.id ? updatedNode : node));
  const nodesBySlug = new Map(
    merged.filter((node) => node.slug).map((node) => [node.slug as string, node])
  );

  if (isCriticalCatalogSlug(updatedNode.slug) && updatedNode.level > prevLevel) {
    return { eventType: 'criticalMilestone', sourceNodeId: updatedNode.id };
  }

  const peerSlugs = getGenerationPeerSlugs(updatedNode.slug);
  if (peerSlugs.length > 1 && isGenerationCompleteForNodes(peerSlugs, nodesBySlug)) {
    const connectedNodeIds = peerSlugs
      .map((peerSlug) => merged.find((node) => node.slug === peerSlug)?.id)
      .filter((id): id is number => id != null);
    return {
      eventType: 'generationComplete',
      connectedNodeIds,
      sourceNodeId: updatedNode.id,
    };
  }

  return {
    eventType: updatedNode.level > prevLevel ? 'levelUp' : 'levelUp',
    sourceNodeId: updatedNode.id,
  };
}
