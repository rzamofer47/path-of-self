import { useMemo, useState, useEffect } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppTheme, SkillNode, User } from '@/src/types';
import { NenRadarChart, getDominantNenAxis, NEN_AXIS_LABELS } from '@/src/components/nen/NenRadarChart';
import { EMPTY_NEN_PROFILE } from '@/src/config/nenConfig';
import { loadSmoothedNenProfile } from '@/src/database/queryEngine';
import { UnderworldSkillsModal } from '@/src/components/UnderworldSkillsModal';
import {
  computeProgressStats,
  MACRO_AREA_LABELS,
  STAT_EXPLANATIONS,
} from '@/src/utils/progressStats';
import { computeSesionesHoy, sessionQualityIcon } from '@/src/utils/sessionQuality';

interface TopBarProps {
  nodes: SkillNode[];
  deletedNodes: SkillNode[];
  user: User | null;
  theme: AppTheme;
  onRestoreNode: (node: SkillNode) => void;
  onResetTestMode?: () => void;
}

interface ProgressBarProps {
  label: string;
  value: number;
  fillColor: string;
  trackColor: string;
  textColor: string;
  mutedColor: string;
  compact?: boolean;
  accessibilityHint?: string;
}

function ProgressBar({
  label,
  value,
  fillColor,
  trackColor,
  textColor,
  mutedColor,
  compact,
  accessibilityHint,
}: ProgressBarProps) {
  return (
    <View
      style={[styles.barBlock, compact && styles.barBlockCompact]}
      accessibilityRole="progressbar"
      accessibilityLabel={`${label} ${value}%`}
      accessibilityHint={accessibilityHint}
    >
      <Text style={[styles.barLabel, { color: mutedColor }]} numberOfLines={1}>
        {label}
      </Text>
      <View style={[styles.barTrack, { backgroundColor: trackColor }]}>
        <View style={[styles.barFill, { width: `${value}%`, backgroundColor: fillColor }]} />
        <Text style={[styles.barPercent, { color: textColor }]}>{value}%</Text>
      </View>
    </View>
  );
}

function StatsInfoPanel({
  visible,
  onClose,
  theme,
  stats,
  deletedCount,
  onOpenUnderworld,
}: {
  visible: boolean;
  onClose: () => void;
  theme: AppTheme;
  stats: ReturnType<typeof computeProgressStats>;
  deletedCount: number;
  onOpenUnderworld: () => void;
}) {
  const lowLabels =
    stats.lowAttentionAreas.length > 0
      ? stats.lowAttentionAreas.map((a) => MACRO_AREA_LABELS[a]).join(', ')
      : null;

  const [nenProfile, setNenProfile] = useState(EMPTY_NEN_PROFILE);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    void loadSmoothedNenProfile().then((profile) => {
      if (!cancelled) setNenProfile(profile);
    });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const dominantAxis = getDominantNenAxis(nenProfile);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.panel, { backgroundColor: '#0a0e14', borderColor: theme.primary }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.panelTitle, { color: theme.primary }]}>Estadísticas del Árbol</Text>

          <View style={styles.nenSection}>
            <Text style={[styles.statHeading, { color: theme.text }]}>Hexágono de Nen</Text>
            <Text style={[styles.statBody, { color: theme.textMuted }]}>
              Promedio suavizado (7 días) de nodos activos por vertiente. Tipo dominante:{' '}
              {NEN_AXIS_LABELS[dominantAxis]}.
            </Text>
            <View style={styles.nenChartWrap}>
              <NenRadarChart profile={nenProfile} accentColor={theme.primary} glowColor={theme.accent} />
            </View>
          </View>

          <View style={styles.statSection}>
            <Text style={[styles.statHeading, { color: theme.text }]}>Compromiso Hoy</Text>
            <Text style={[styles.statBody, { color: theme.textMuted }]}>
              {STAT_EXPLANATIONS.active}
            </Text>
            <Text style={[styles.statValue, { color: theme.accent }]}>
              {STAT_EXPLANATIONS.activeDetail(
                stats.compromisoChecksHoy,
                stats.compromisoActivados
              )}{' '}
              ({stats.activeProgress}%)
            </Text>
          </View>

          <View style={styles.statSection}>
            <Text style={[styles.statHeading, { color: theme.text }]}>Árbol Explorado</Text>
            <Text style={[styles.statBody, { color: theme.textMuted }]}>
              {STAT_EXPLANATIONS.global}
            </Text>
            <Text style={[styles.statValue, { color: theme.primary }]}>
              {STAT_EXPLANATIONS.globalDetail(stats.arbolActivados, stats.arbolTotal)} (
              {stats.globalProgress}%)
            </Text>
          </View>

          <View style={styles.statSection}>
            <Text style={[styles.statHeading, { color: theme.text }]}>% de Olvido</Text>
            <Text style={[styles.statBody, { color: theme.textMuted }]}>
              {STAT_EXPLANATIONS.forget}
            </Text>
            <Text style={[styles.statValue, { color: theme.legacyTag }]}>
              Actual: {stats.forgetPercent}%
            </Text>
          </View>

          <View style={[styles.reminderBox, { borderColor: theme.primary }]}>
            <Text style={[styles.reminderTitle, { color: theme.primary }]}>
              Áreas que necesitan atención
            </Text>
            {lowLabels ? (
              <Text style={[styles.reminderText, { color: theme.text }]}>
                Tus constelaciones{' '}
                <Text style={{ color: theme.secondary, fontWeight: '700' }}>{lowLabels}</Text>{' '}
                están bajas o sin práctica reciente. Forja o registra XP en esos sectores para
                recuperar brillo y frenar el olvido.
              </Text>
            ) : (
              <Text style={[styles.reminderText, { color: theme.textMuted }]}>
                Todas las macro-áreas mantienen un ritmo saludable. Sigue así.
              </Text>
            )}
          </View>

          <Pressable
            style={[styles.underworldLink, { borderColor: theme.legacyTag }]}
            onPress={() => {
              onClose();
              onOpenUnderworld();
            }}
          >
            <Text style={[styles.underworldLinkTitle, { color: theme.legacyTag }]}>
              Habilidades en el Inframundo
            </Text>
            <Text style={[styles.underworldLinkSub, { color: theme.textMuted }]}>
              {deletedCount > 0
                ? `${deletedCount} nodo${deletedCount === 1 ? '' : 's'} archivado${deletedCount === 1 ? '' : 's'} — restaurar sin perder progreso`
                : 'Papelera vacía — los nodos eliminados aparecerán aquí'}
            </Text>
          </Pressable>

          <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
            <Text style={{ color: theme.textMuted }}>Cerrar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function TopBar({ nodes, deletedNodes, user, theme, onRestoreNode, onResetTestMode }: TopBarProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [underworldOpen, setUnderworldOpen] = useState(false);
  const [sessionTooltipVisible, setSessionTooltipVisible] = useState(false);
  const { width } = useWindowDimensions();
  const compact = width < 520;
  const wide = width >= 768;

  const stats = useMemo(() => computeProgressStats(nodes, user), [nodes, user]);
  const sesionesHoy = useMemo(
    () => computeSesionesHoy(nodes.filter((n) => !n.isDeleted && n.id > 0)),
    [nodes]
  );

  const trackColor = theme.surface;
  const forgetTone =
    stats.forgetPercent >= 55
      ? theme.legacyTag
      : stats.forgetPercent >= 30
        ? theme.secondary
        : theme.textMuted;

  return (
    <View style={[styles.root, wide && styles.rootWide, { backgroundColor: '#050507ee' }]}>
      <View style={[styles.mainRow, compact && styles.mainRowCompact]}>
        <View style={[styles.barsWrap, compact && styles.barsWrapCompact]}>
          <ProgressBar
            label="Compromiso Hoy"
            value={stats.activeProgress}
            fillColor={theme.accent}
            trackColor={trackColor}
            textColor={theme.text}
            mutedColor={theme.textMuted}
            compact={compact}
            accessibilityHint={STAT_EXPLANATIONS.activeDetail(
              stats.compromisoChecksHoy,
              stats.compromisoActivados
            )}
          />
          <ProgressBar
            label="Árbol Explorado"
            value={stats.globalProgress}
            fillColor={theme.primary}
            trackColor={trackColor}
            textColor={theme.text}
            mutedColor={theme.textMuted}
            compact={compact}
            accessibilityHint={STAT_EXPLANATIONS.globalDetail(
              stats.arbolActivados,
              stats.arbolTotal
            )}
          />
        </View>

        <Pressable
          accessibilityRole="text"
          accessibilityLabel="Sesiones de hoy"
          accessibilityHint={`Parcial ${sesionesHoy.parcial}, completa ${sesionesHoy.completa}, extendida ${sesionesHoy.extendida}`}
          onLongPress={() => setSessionTooltipVisible(true)}
          delayLongPress={400}
          style={styles.sessionCounter}
        >
          <Text
            style={[
              styles.sessionIcon,
              { color: theme.text },
              sesionesHoy.parcial === 0 && styles.sessionIconMuted,
            ]}
          >
            {sessionQualityIcon('parcial')} {sesionesHoy.parcial}
          </Text>
          <Text
            style={[
              styles.sessionIcon,
              { color: theme.text },
              sesionesHoy.completa === 0 && styles.sessionIconMuted,
            ]}
          >
            {sessionQualityIcon('completa')} {sesionesHoy.completa}
          </Text>
          <Text
            style={[
              styles.sessionIcon,
              { color: theme.text },
              sesionesHoy.extendida === 0 && styles.sessionIconMuted,
            ]}
          >
            {sessionQualityIcon('extendida')} {sesionesHoy.extendida}
          </Text>
        </Pressable>

        <View style={[styles.sideCol, compact && styles.sideColCompact]}>
          <View style={[styles.forgetBadge, { borderColor: forgetTone }]}>
            <Text style={[styles.forgetLabel, { color: theme.textMuted }]}>Olvido</Text>
            <Text style={[styles.forgetValue, { color: forgetTone }]}>
              {stats.forgetPercent}%
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Habilidades en el Inframundo"
            onPress={() => setUnderworldOpen(true)}
            style={({ pressed }) => [
              styles.underworldBtn,
              {
                borderColor: theme.legacyTag,
                backgroundColor: pressed ? 'rgba(180, 120, 60, 0.18)' : 'transparent',
              },
            ]}
          >
            <Text style={[styles.underworldBtnText, { color: theme.legacyTag }]}>☠</Text>
            {deletedNodes.length > 0 ? (
              <View style={[styles.underworldBadge, { backgroundColor: theme.legacyTag }]}>
                <Text style={styles.underworldBadgeText}>{deletedNodes.length}</Text>
              </View>
            ) : null}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reiniciar modo prueba"
            onPress={onResetTestMode}
            style={({ pressed }) => [
              styles.resetBtn,
              {
                borderColor: theme.secondary,
                backgroundColor: pressed ? 'rgba(201, 162, 39, 0.18)' : 'transparent',
                opacity: onResetTestMode ? 1 : 0.35,
              },
            ]}
            disabled={!onResetTestMode}
          >
            <Text style={[styles.resetBtnText, { color: theme.secondary }]}>↺</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Información de estadísticas"
            onPress={() => setInfoOpen(true)}
            style={({ pressed }) => [
              styles.infoBtn,
              {
                borderColor: theme.primary,
                backgroundColor: pressed ? theme.primary : 'transparent',
              },
            ]}
          >
            {({ pressed }) => (
              <Text
                style={[
                  styles.infoBtnText,
                  { color: pressed ? '#0a0e14' : theme.primary },
                ]}
              >
                [ i ]
              </Text>
            )}
          </Pressable>
        </View>
      </View>

      <StatsInfoPanel
        visible={infoOpen}
        onClose={() => setInfoOpen(false)}
        theme={theme}
        stats={stats}
        deletedCount={deletedNodes.length}
        onOpenUnderworld={() => setUnderworldOpen(true)}
      />

      <Modal
        visible={sessionTooltipVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSessionTooltipVisible(false)}
      >
        <Pressable
          style={styles.sessionTooltipOverlay}
          onPress={() => setSessionTooltipVisible(false)}
        >
          <View style={[styles.sessionTooltipCard, { borderColor: theme.primary }]}>
            <Text style={[styles.sessionTooltipText, { color: theme.text }]}>Sesiones de hoy</Text>
          </View>
        </Pressable>
      </Modal>

      <UnderworldSkillsModal
        visible={underworldOpen}
        nodes={deletedNodes}
        theme={theme}
        onClose={() => setUnderworldOpen(false)}
        onRestore={(node) => {
          onRestoreNode(node);
          setUnderworldOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(201, 162, 39, 0.25)',
    zIndex: 200,
    elevation: 200,
  },
  rootWide: {
    paddingHorizontal: 20,
    maxWidth: 960,
    alignSelf: 'center',
    width: '100%',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mainRowCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
  },
  barsWrap: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  barsWrapCompact: {
    flexDirection: 'column',
    gap: 6,
  },
  sessionCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  sessionIcon: {
    fontSize: 11,
    fontWeight: '700',
  },
  sessionIconMuted: {
    opacity: 0.35,
  },
  sessionTooltipOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionTooltipCard: {
    backgroundColor: '#12121F',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sessionTooltipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sideCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sideColCompact: {
    justifyContent: 'space-between',
  },
  barBlock: {
    flex: 1,
    minWidth: 0,
  },
  barBlockCompact: {
    flex: 0,
  },
  barLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
    textAlign: 'center',
  },
  barTrack: {
    height: 22,
    borderRadius: 11,
    overflow: 'hidden',
    justifyContent: 'center',
    position: 'relative',
  },
  barFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 11,
    opacity: 0.85,
  },
  barPercent: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    zIndex: 1,
    letterSpacing: 0.3,
  },
  forgetBadge: {
    minWidth: 56,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  forgetLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  forgetValue: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 16,
  },
  infoBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetBtnText: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20,
  },
  infoBtnText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  underworldBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  underworldBtnText: {
    fontSize: 16,
    lineHeight: 18,
  },
  underworldBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  underworldBadgeText: {
    color: '#0a0e14',
    fontSize: 9,
    fontWeight: '800',
  },
  underworldLink: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  underworldLinkTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.35,
    marginBottom: 4,
  },
  underworldLinkSub: {
    fontSize: 11,
    lineHeight: 16,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center',
    padding: 20,
  },
  panel: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 18,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  statSection: {
    marginBottom: 12,
  },
  nenSection: {
    marginBottom: 14,
    alignItems: 'center',
  },
  nenChartWrap: {
    marginTop: 8,
    paddingVertical: 4,
    backgroundColor: 'transparent',
  },
  statHeading: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  statBody: {
    fontSize: 12,
    lineHeight: 18,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  reminderBox: {
    marginTop: 4,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  reminderTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  reminderText: {
    fontSize: 12,
    lineHeight: 18,
  },
  closeBtn: {
    marginTop: 14,
    alignSelf: 'flex-end',
  },
});
