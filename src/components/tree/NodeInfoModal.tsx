import { useEffect, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { DECAY_CATEGORIAS } from '@/src/config/nenDecayConfig';
import { getNodeStreakStatsForNode } from '@/src/database/queryEngine';
import { AppTheme, DecayCategoria, MacroArea, SkillNode } from '@/src/types';
import { confirmDestructive } from '@/src/utils/confirmAction';
import {
  formatStreakLastCheckLabel,
} from '@/src/utils/nodeStreak';
import { formatLastCheckLabel, isVisualDecayTrackedNode } from '@/src/utils/visualDecay';
import { isDeletableNode } from '@/src/utils/nodeMenuPolicy';
import { resolveNodeGuideContent } from '@/src/utils/resolveNodeGuideContent';
import { resolveDecayCategoria } from '@/src/utils/resolveNenDecayCategory';
import { PROGRESION_CONFIG, xpInCurrentLevel } from '@/src/config/progressionConfig';
import { getWildcardDisplayName, isWildcardNode } from '@/src/utils/wildcardNodes';
import {
  formatHistoryDayLabel,
  sessionQualityIcon,
} from '@/src/utils/sessionQuality';

import { WildcardSelectionPanel } from './WildcardSelectionPanel';

interface NodeInfoModalProps {
  visible: boolean;
  node: SkillNode | null;
  nodes?: SkillNode[];
  theme: AppTheme;
  onClose: () => void;
  onDeleteNode?: (node: SkillNode) => void;
  onConfigureWildcard?: (
    node: SkillNode,
    name: string,
    decayCategoria?: DecayCategoria
  ) => void | Promise<void>;
}

const MACRO_AREA_LABELS: Record<MacroArea, string> = {
  physical: 'Forja del Cuerpo',
  intellectual: 'Cámara del Intelecto',
  mental_emotional: 'Santuario Interior',
  productive: 'Taller del Alquimista',
};

async function openYoutubeUrl(url: string): Promise<void> {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('YouTube', 'No se pudo abrir el enlace en este dispositivo.');
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert('YouTube', 'No se pudo abrir el videotutorial. Inténtalo de nuevo.');
  }
}

function YoutubeLogo({ size = 22 }: { size?: number }) {
  const height = size * 0.72;
  return (
    <Svg width={size} height={height} viewBox="0 0 22 16">
      <Rect x={0} y={0} width={22} height={16} rx={4} fill="#FF0033" />
      <Path d="M9 4.5 L15.5 8 L9 11.5 Z" fill="#FFFFFF" />
    </Svg>
  );
}

export function NodeInfoModal({
  visible,
  node,
  nodes = [],
  theme,
  onClose,
  onDeleteNode,
  onConfigureWildcard,
}: NodeInfoModalProps) {
  const [streakCurrent, setStreakCurrent] = useState<number | null>(null);
  const [streakMax, setStreakMax] = useState<number | null>(null);
  const [streakLastCheck, setStreakLastCheck] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !node) {
      setStreakCurrent(null);
      setStreakMax(null);
      setStreakLastCheck(null);
      return;
    }

    let cancelled = false;
    void getNodeStreakStatsForNode(node).then((stats) => {
      if (cancelled) return;
      setStreakCurrent(stats.currentStreak);
      setStreakMax(stats.maxStreak);
      setStreakLastCheck(formatStreakLastCheckLabel(stats.lastCheckDaysAgo));
    });

    return () => {
      cancelled = true;
    };
  }, [visible, node?.id, node?.dailyVerifiedAt]);

  if (!node) return null;

  const isWildcard = isWildcardNode(node);
  const guide = resolveNodeGuideContent(node);
  const accent = theme.primary;
  const xpInLevel = xpInCurrentLevel(node.xp);
  const lastCheckLabel = isVisualDecayTrackedNode(node)
    ? formatLastCheckLabel(node)
    : null;

  const practiceParams = DECAY_CATEGORIAS[resolveDecayCategoria(node, nodes)];
  const recentHistory = (node.sessionQualityHistory ?? []).slice(-5).reverse();

  const handleConfigureWildcard = (name: string, decayCategoria: DecayCategoria) => {
    if (!onConfigureWildcard) return;
    void Promise.resolve(onConfigureWildcard(node, name, decayCategoria)).then(() => onClose());
  };

  const handleOpenYoutube = () => {
    if (guide.youtubeUrl) void openYoutubeUrl(guide.youtubeUrl);
  };

  const handleDelete = () => {
    if (!onDeleteNode || !isDeletableNode(node)) return;

    confirmDestructive(
      'Archivar habilidad',
      `"${node.name}" se ocultará del mapa. Conservarás nivel, XP y posición. Podrás restaurarlo desde el Inframundo.`,
      () => {
        onDeleteNode(node);
        onClose();
      }
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay} pointerEvents="box-none">
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar" />

        <View
          style={[styles.modal, { borderColor: accent }]}
          accessibilityViewIsModal
          onStartShouldSetResponder={() => true}
        >
          <View style={[styles.headerRule, { backgroundColor: accent }]} />

          <Text style={[styles.title, { color: accent }]}>
            {isWildcard ? getWildcardDisplayName(node) : node.name}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {MACRO_AREA_LABELS[node.macroArea]} · Nivel {node.level} · {xpInLevel}/{PROGRESION_CONFIG.xpPorNivel} XP
          </Text>
          {isWildcard && onConfigureWildcard ? (
            <View style={styles.wildcardBlock}>
              <WildcardSelectionPanel
                accentColor={accent}
                theme={theme}
                onSave={handleConfigureWildcard}
                onCancel={onClose}
              />
            </View>
          ) : null}
          {lastCheckLabel ? (
            <Text style={[styles.checkLine, { color: theme.textMuted }]}>
              Último Check: {lastCheckLabel}
            </Text>
          ) : null}
          {isVisualDecayTrackedNode(node) && streakCurrent != null ? (
            <View style={styles.streakBlock}>
              <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>RACHA</Text>
              <Text style={[styles.streakLine, { color: theme.text }]}>
                Actual: {streakCurrent} días · Máxima: {streakMax ?? 0} días
              </Text>
              <Text style={[styles.checkLine, { color: theme.textMuted }]}>
                Último check registrado: {streakLastCheck}
              </Text>
            </View>
          ) : null}

          {!isWildcard ? (
            <View style={styles.practiceBlock}>
              <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
                PRÁCTICA RECOMENDADA
              </Text>
              <Text style={[styles.practiceLine, { color: theme.text }]}>
                {sessionQualityIcon('parcial')} Mínimo{'      '}
                {practiceParams.sesionMinima} min
              </Text>
              <Text style={[styles.practiceLine, { color: theme.text }]}>
                {sessionQualityIcon('completa')} Óptimo{'     '}
                {practiceParams.sesionOptima} min
              </Text>
              <Text style={[styles.practiceLine, { color: theme.text }]}>
                {sessionQualityIcon('extendida')} Máximo{'     '}
                {practiceParams.sesionMaxima} min
              </Text>
              <Text style={[styles.practiceLine, { color: theme.textMuted }]}>
                {'   '}Frecuencia{'  '}
                {practiceParams.frecuenciaSemanal}x por semana
              </Text>

              <Text style={[styles.sectionLabel, styles.historyLabel, { color: theme.textMuted }]}>
                HISTORIAL RECIENTE
              </Text>
              {recentHistory.length === 0 ? (
                <Text style={[styles.practiceLine, { color: theme.textMuted }]}>
                  Sin sesiones registradas aún.
                </Text>
              ) : (
                recentHistory.map((entry, index) => {
                  const older = recentHistory.slice(index + 1);
                  return (
                    <Text
                      key={`${entry.fecha}-${entry.calidad}`}
                      style={[styles.practiceLine, { color: theme.text }]}
                    >
                      ● {sessionQualityIcon(entry.calidad)}{' '}
                      {formatHistoryDayLabel(entry.fecha, older)}
                    </Text>
                  );
                })
              )}
            </View>
          ) : null}

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {!isWildcard && guide.beneficio ? (
              <View style={styles.metaBlock}>
                <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>PARA QUÉ SIRVE</Text>
                <Text style={[styles.body, { color: theme.text }]}>{guide.beneficio}</Text>
              </View>
            ) : null}

            {!isWildcard ? (
              <View style={styles.metaBlock}>
                <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>QUÉ HACER</Text>
                <Text style={[styles.body, { color: theme.text }]}>{guide.comoHacerlo}</Text>
              </View>
            ) : (
              <View style={styles.metaBlock}>
                <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>NODO DE SELECCIÓN</Text>
                <Text style={[styles.body, { color: theme.text }]}>
                  Elige el nombre de tu disciplina arriba y pulsa «Forjar camino» para desbloquear
                  las sub-habilidades conectadas a este comodín.
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            {guide.youtubeUrl ? (
              <Pressable
                style={({ pressed }) => [
                  styles.youtubeBtn,
                  pressed && styles.youtubeBtnPressed,
                ]}
                onPress={handleOpenYoutube}
                accessibilityRole="link"
                accessibilityLabel="Ver videotutorial en YouTube"
              >
                <View style={styles.youtubeLogoWrap}>
                  <YoutubeLogo size={24} />
                </View>
                <View style={styles.youtubeTextWrap}>
                  <Text style={styles.youtubeTitle}>Ver cómo se hace</Text>
                  <Text style={styles.youtubeSub} numberOfLines={1}>
                    Abrir tutorial en YouTube
                  </Text>
                </View>
              </Pressable>
            ) : (
              <Text style={[styles.noVideoHint, { color: theme.textMuted }]}>
                No hay videotutorial vinculado a este nodo todavía.
              </Text>
            )}

            {isDeletableNode(node) && onDeleteNode ? (
              <Pressable style={[styles.linkBtn, styles.deleteBtn]} onPress={handleDelete}>
                <Text style={[styles.linkBtnText, styles.deleteBtnText]}>Archivar habilidad</Text>
              </Pressable>
            ) : null}

            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Text style={[styles.closeText, { color: theme.textMuted }]}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 6, 10, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    width: '100%',
    maxWidth: 320,
    maxHeight: '82%',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
    borderWidth: 1.5,
    backgroundColor: '#0a0e14',
    zIndex: 1,
    overflow: 'hidden',
  },
  headerRule: {
    width: 36,
    height: 2,
    borderRadius: 1,
    opacity: 0.85,
    marginBottom: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  checkLine: {
    fontSize: 11,
    marginBottom: 12,
    letterSpacing: 0.15,
  },
  streakBlock: {
    marginBottom: 10,
    gap: 2,
  },
  practiceBlock: {
    marginTop: 4,
    marginBottom: 10,
    gap: 2,
  },
  practiceLine: {
    fontSize: 12,
    lineHeight: 20,
  },
  historyLabel: {
    marginTop: 8,
  },
  streakLine: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  wildcardBlock: {
    marginTop: 12,
    marginBottom: 4,
    alignItems: 'center',
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: 4,
  },
  metaBlock: {
    marginTop: 10,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  body: {
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(180, 150, 90, 0.15)',
    gap: 10,
  },
  noVideoHint: {
    fontSize: 11,
    fontStyle: 'italic',
    lineHeight: 16,
    textAlign: 'center',
  },
  youtubeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 51, 0.45)',
    backgroundColor: 'rgba(255, 0, 51, 0.1)',
  },
  youtubeBtnPressed: {
    backgroundColor: 'rgba(255, 0, 51, 0.2)',
    borderColor: 'rgba(255, 0, 51, 0.65)',
  },
  youtubeLogoWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  youtubeTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  youtubeTitle: {
    color: '#f0e6d2',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.25,
  },
  youtubeSub: {
    color: '#b8a88a',
    fontSize: 10,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  linkBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  linkBtnText: {
    fontWeight: '700',
    fontSize: 12,
  },
  deleteBtn: {
    borderColor: '#ff3355',
    backgroundColor: 'rgba(255, 0, 50, 0.12)',
  },
  deleteBtnText: {
    color: '#ff6688',
  },
  closeBtn: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  closeText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.35,
  },
});
