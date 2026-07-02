import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  NEN_PALETA,
  NenAxisId,
  NenProfile,
} from '@/src/config/nenConfig';
import { NEN_MOTHER_ROOTS } from '@/src/config/nenMotherRoots';
import { getNodeStreakStatsForNode } from '@/src/database/queryEngine';
import { MacroArea, SkillNode } from '@/src/types';
import { esNodoActivado } from '@/src/utils/progressStats';
import { calcularEstadoEje, nodesInNenBranch, NenEjeEstado } from '@/src/utils/nenMotherBranch';

const PANEL_BG = '#0D0D1A';

const MACRO_AREA_SHORT: Record<MacroArea, string> = {
  physical: 'Física',
  intellectual: 'Intelectual',
  mental_emotional: 'Mental/Emocional',
  productive: 'Productiva',
};

const ESTADO_COLOR: Record<NenEjeEstado, string | undefined> = {
  Estable: undefined,
  Enfriando: '#F59E0B',
  'En decay': '#EF4444',
};

export interface NenMotherPanelProps {
  nenAxisId: NenAxisId | null;
  visible: boolean;
  nodes: SkillNode[];
  nenProfile: NenProfile;
  onClose: () => void;
}

interface NodeWithStreak {
  node: SkillNode;
  streak: number;
}

export function NenMotherPanel({
  nenAxisId,
  visible,
  nodes,
  nenProfile,
  onClose,
}: NenMotherPanelProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(8)).current;
  const [mounted, setMounted] = useState(visible);
  const [streakRows, setStreakRows] = useState<NodeWithStreak[]>([]);

  const motherDef = useMemo(
    () => (nenAxisId ? NEN_MOTHER_ROOTS.find((r) => r.id === nenAxisId) ?? null : null),
    [nenAxisId]
  );

  const paleta = nenAxisId ? NEN_PALETA[nenAxisId] : null;

  const branchData = useMemo(() => {
    if (!nenAxisId) return null;

    const nodosRama = nodesInNenBranch(nodes, nenAxisId);
    const nodosActivados = nodosRama.filter(esNodoActivado);
    const valorEje = nenProfile[nenAxisId];
    const estadoNen = calcularEstadoEje(nodes, nenAxisId);

    const nodosListados = [...nodosActivados]
      .sort((a, b) => b.level - a.level)
      .slice(0, 3);

    const sinDescubrir = Math.max(0, nodosRama.length - nodosActivados.length);

    return {
      nodosRama,
      nodosActivados,
      nodosTotal: nodosRama.length,
      valorEje,
      estadoNen,
      nodosListados,
      sinDescubrir,
    };
  }, [nenAxisId, nodes, nenProfile]);

  useEffect(() => {
    if (!visible || !branchData) {
      setStreakRows([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      const rows = await Promise.all(
        branchData.nodosActivados.map(async (node) => {
          const stats = await getNodeStreakStatsForNode(node);
          return { node, streak: stats.currentStreak };
        })
      );
      if (!cancelled) setStreakRows(rows);
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, branchData]);

  const rachaActivaRama = useMemo(
    () => Math.max(0, ...streakRows.map((r) => r.streak)),
    [streakRows]
  );

  const campeon = useMemo(() => {
    if (streakRows.length === 0) return null;
    return [...streakRows].sort((a, b) => b.streak - a.streak)[0];
  }, [streakRows]);

  const diasSinPractica = useMemo(() => {
    if (!branchData || branchData.nodosActivados.length === 0) return null;
    const now = Date.now();
    let maxDays = 0;
    for (const node of branchData.nodosActivados) {
      const ts = node.dailyVerifiedAt ?? node.lastPracticeAt ?? node.createdAt;
      const days = Math.floor((now - new Date(ts).getTime()) / 86400000);
      maxDays = Math.max(maxDays, days);
    }
    return maxDays;
  }, [branchData]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      fadeAnim.setValue(0);
      slideAnim.setValue(8);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
      return;
    }

    if (!mounted) return;

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 8, duration: 200, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [visible, fadeAnim, slideAnim, mounted]);

  if (!mounted || !nenAxisId || !paleta || !motherDef || !branchData) {
    return null;
  }

  const estadoColor = ESTADO_COLOR[branchData.estadoNen] ?? paleta.colorText;
  const decayHint =
    branchData.estadoNen === 'Estable'
      ? diasSinPractica != null && diasSinPractica === 0
        ? 'Sin decay · práctica registrada hoy'
        : diasSinPractica != null
          ? `Sin decay · última práctica hace ${diasSinPractica === 1 ? '1d' : `${diasSinPractica}d`}`
          : 'Sin decay en esta rama'
      : branchData.estadoNen === 'Enfriando'
        ? 'Algunas habilidades se están enfriando'
        : 'Esta área lleva tiempo sin actividad';

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          style={[
            styles.panelWrap,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Pressable
            style={[
              styles.panel,
              { borderColor: paleta.colorMuted, borderTopColor: paleta.color },
            ]}
            onPress={() => {}}
          >
            <View style={[styles.topAccent, { backgroundColor: paleta.color }]} />

            <View style={styles.header}>
              <View style={[styles.headerOrb, { borderColor: paleta.color, backgroundColor: PANEL_BG }]}>
                <View style={[styles.headerOrbCore, { backgroundColor: paleta.colorGlow }]} />
              </View>
              <View style={styles.headerText}>
                <Text style={[styles.motherName, { color: paleta.colorText }]} numberOfLines={2}>
                  {motherDef.name}
                </Text>
                <Text style={styles.motherMeta}>
                  {paleta.label} · {MACRO_AREA_SHORT[motherDef.macroArea]}
                </Text>
              </View>
              <Text style={[styles.axisValue, { color: paleta.color }]}>
                {branchData.valorEje}
                <Text style={styles.axisMax}>/100</Text>
              </Text>
            </View>

            <View style={styles.statsRow}>
              <StatCell
                label="Descubiertas"
                value={`${branchData.nodosActivados.length} / ${branchData.nodosTotal}`}
                accent={paleta.colorText}
              />
              <StatCell
                label="Racha activa"
                value={rachaActivaRama > 0 ? `${rachaActivaRama} días` : '—'}
                accent={paleta.colorText}
              />
              <StatCell label="Nen" value={branchData.estadoNen} accent={estadoColor} />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Eje de Nen</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${Math.min(100, branchData.valorEje)}%`,
                      backgroundColor: paleta.color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barHint}>{decayHint}</Text>
            </View>

            {campeon && campeon.streak > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Campeón de la rama</Text>
                <View style={styles.championRow}>
                  <View style={[styles.championOrb, { borderColor: paleta.color }]} />
                  <Text style={styles.championName} numberOfLines={1}>
                    {campeon.node.name}
                  </Text>
                  <Text style={[styles.championStreak, { color: paleta.color }]}>🔥{campeon.streak}</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Habilidades activas</Text>
              {branchData.nodosListados.length === 0 ? (
                <Text style={styles.emptyHint}>Aún no hay habilidades activas en esta rama.</Text>
              ) : (
                branchData.nodosListados.map((node) => (
                  <View key={node.id} style={styles.skillRow}>
                    <View style={[styles.skillDot, { backgroundColor: paleta.color }]} />
                    <Text style={styles.skillName} numberOfLines={1}>
                      {node.name}
                    </Text>
                    <Text style={[styles.skillLevel, { color: paleta.colorMuted }]}>
                      niv. {node.level}
                    </Text>
                  </View>
                ))
              )}
              {branchData.sinDescubrir > 0 ? (
                <Text style={styles.moreHint}>+ {branchData.sinDescubrir} sin descubrir</Text>
              ) : null}
            </View>

            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <Text style={styles.closeText}>Cerrar</Text>
            </Pressable>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function StatCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: accent }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  panelWrap: {
    width: '100%',
    maxWidth: 400,
  },
  panel: {
    backgroundColor: PANEL_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderTopWidth: 4,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 0,
  },
  topAccent: {
    height: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerOrb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerOrbCore: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  motherName: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  motherMeta: {
    fontSize: 11,
    color: 'rgba(200,210,230,0.65)',
  },
  axisValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  axisMax: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(200,210,230,0.45)',
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 10,
    marginBottom: 12,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statLabel: {
    fontSize: 9,
    color: 'rgba(180,190,210,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(180,190,210,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barHint: {
    fontSize: 10,
    color: 'rgba(180,190,210,0.55)',
    marginTop: 4,
  },
  championRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  championOrb: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    backgroundColor: PANEL_BG,
  },
  championName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#E8ECF4',
  },
  championStreak: {
    fontSize: 12,
    fontWeight: '800',
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  skillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  skillName: {
    flex: 1,
    fontSize: 12,
    color: '#DDE4F0',
  },
  skillLevel: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyHint: {
    fontSize: 11,
    color: 'rgba(180,190,210,0.55)',
    fontStyle: 'italic',
  },
  moreHint: {
    fontSize: 10,
    color: 'rgba(180,190,210,0.45)',
    marginTop: 4,
  },
  closeBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  closeText: {
    color: 'rgba(180,190,210,0.65)',
    fontWeight: '600',
    fontSize: 13,
  },
});
