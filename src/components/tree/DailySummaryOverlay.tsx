import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { NEN_AXIS_LABELS, NenAxisId } from '@/src/config/nenConfig';
import { getWeeklyNenGrowthHighlight } from '@/src/database/nenHistory';
import { getNodeStreakStatsForNode } from '@/src/database/queryEngine';
import { AppTheme, SkillNode } from '@/src/types';
import { getNodeVisualIntensity } from '@/src/utils/nodeIntensity';
import { isDailyVerifiedToday } from '@/src/utils/dailyVerification';
import { getDecayState, isVisualDecayTrackedNode } from '@/src/utils/visualDecay';
import { SPACE_BG } from '@/src/utils/treeLayout';

interface DailySummaryOverlayProps {
  visible: boolean;
  userName?: string;
  nodes: SkillNode[];
  theme: AppTheme;
  onDismiss: () => void;
}

function greetingForHour(now: Date, name: string): string {
  const hour = now.getHours();
  const saludo =
    hour >= 20 || hour < 5
      ? 'Buenas noches'
      : hour >= 12
        ? 'Buenas tardes'
        : 'Buenos días';
  return `${saludo}, ${name}`;
}

interface PendingNode {
  node: SkillNode;
  streak: number;
}

async function loadPendingChecks(nodes: SkillNode[]): Promise<PendingNode[]> {
  const pending: PendingNode[] = [];

  for (const node of nodes) {
    if (!isVisualDecayTrackedNode(node)) continue;
    if (isDailyVerifiedToday(node)) continue;
    const stats = await getNodeStreakStatsForNode(node);
    pending.push({ node, streak: stats.currentStreak });
  }

  pending.sort((a, b) => b.streak - a.streak);
  return pending.slice(0, 5);
}

function pickRandomColdNode(nodes: SkillNode[]): SkillNode | null {
  const cold = nodes.filter(
    (node) => isVisualDecayTrackedNode(node) && getDecayState(node) === 'cold'
  );
  if (cold.length === 0) return null;
  return cold[Math.floor(Math.random() * cold.length)];
}

function pickAccentColor(nodes: SkillNode[], theme: AppTheme): string {
  const active = [...nodes]
    .filter((n) => n.id > 0 && !n.isDeleted && n.level >= 1)
    .sort((a, b) => b.xp - a.xp)[0];
  if (!active) return theme.primary;
  return getNodeVisualIntensity(active, nodes, null).palette.glow;
}

export function DailySummaryOverlay({
  visible,
  userName = 'Viajero',
  nodes,
  theme,
  onDismiss,
}: DailySummaryOverlayProps) {
  const [pending, setPending] = useState<PendingNode[]>([]);
  const [nenHighlight, setNenHighlight] = useState<{
    axisId: NenAxisId;
    growthPct: number;
  } | null>(null);
  const [coldNode, setColdNode] = useState<SkillNode | null>(null);

  const accent = useMemo(() => pickAccentColor(nodes, theme), [nodes, theme]);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    (async () => {
      const [checks, growth] = await Promise.all([
        loadPendingChecks(nodes),
        getWeeklyNenGrowthHighlight(),
      ]);
      if (cancelled) return;
      setPending(checks);
      setNenHighlight(growth);
      setColdNode(pickRandomColdNode(nodes));
    })();

    const timer = setTimeout(onDismiss, 3800);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [visible, nodes, onDismiss]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <View style={[styles.card, { borderColor: accent }]}>
          <View style={[styles.accentBar, { backgroundColor: accent }]} />
          <Text style={[styles.greeting, { color: accent }]}>
            {greetingForHour(new Date(), userName)}
          </Text>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
              CHECKS PENDIENTES HOY
            </Text>
            {pending.length === 0 ? (
              <Text style={[styles.body, { color: theme.text }]}>
                Todo al día — buen trabajo.
              </Text>
            ) : (
              pending.map(({ node, streak }) => (
                <Text key={node.id} style={[styles.listItem, { color: theme.text }]}>
                  · {node.name}
                  {streak > 0 ? ` (racha ${streak}d)` : ''}
                </Text>
              ))
            )}
          </View>

          {nenHighlight ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>ESTADO DEL NEN</Text>
              <Text style={[styles.body, { color: theme.text }]}>
                Tu {NEN_AXIS_LABELS[nenHighlight.axisId]} subió un{' '}
                {Math.round(nenHighlight.growthPct)}% esta semana.
              </Text>
            </View>
          ) : null}

          {coldNode ? (
            <View style={styles.section}>
              <Text style={[styles.coldHint, { color: accent }]}>
                "{coldNode.name}" te extraña
              </Text>
            </View>
          ) : null}

          <Text style={[styles.tapHint, { color: theme.textMuted }]}>Toca para continuar</Text>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 6, 10, 0.94)',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    backgroundColor: SPACE_BG,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 22,
    gap: 14,
  },
  accentBar: {
    width: 48,
    height: 3,
    borderRadius: 2,
    opacity: 0.9,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  section: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
  },
  listItem: {
    fontSize: 13,
    lineHeight: 20,
  },
  coldHint: {
    fontSize: 14,
    fontStyle: 'italic',
    fontWeight: '600',
  },
  tapHint: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 0.3,
  },
});
