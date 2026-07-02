import { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { NenRadarChart } from '@/src/components/nen/NenRadarChart';
import { OrbVisual } from '@/src/components/tree/OrbVisual';
import { buildNodeMenuActions } from '@/src/components/tree/buildNodeMenuActions';
import { NodeRadialMenu } from '@/src/components/tree/NodeRadialMenu';
import { EMPTY_NEN_PROFILE } from '@/src/config/nenConfig';
import { useAppContext } from '@/src/context/AppContext';
import { requestAutoFocusMap, setTutorialCompleted } from '@/src/storage/localPrefs';
import { SkillNode } from '@/src/types';
import { SPACE_BG } from '@/src/utils/treeLayout';

const { width: SCREEN_W } = Dimensions.get('window');

const DEMO_PROFILE = {
  intensification: 72,
  transformation: 48,
  specialization: 55,
  emission: 40,
  manipulation: 62,
  materialization: 50,
};

const EXAMPLE_NODE: SkillNode = {
  id: -99,
  slug: 'tutorial_demo',
  name: 'Respiración Cuadrada',
  type: 'intellectual',
  layer: 'custom',
  macroArea: 'mental_emotional',
  xp: 120,
  level: 2,
  posX: 0,
  posY: 0,
  lastPracticeAt: null,
  weeklyXpSessions: 0,
  weekStartAt: null,
  dailyVerifiedAt: new Date().toISOString(),
  sessionQuality: 'completa',
  sessionQualityHistory: null,
  guideUrl: null,
  colorRole: 'standard',
  parentId: null,
  originPosX: null,
  originPosY: null,
  isDeleted: false,
  decayCategoria: null,
  createdAt: new Date().toISOString(),
};

const SLIDES = [
  { key: 'welcome', title: 'Path of Self', subtitle: 'Tu árbol de habilidades personal' },
  { key: 'orbs', title: 'Los 4 botones de cada orbe', subtitle: '' },
  { key: 'nen', title: 'Tu energía Nen', subtitle: '' },
  { key: 'start', title: 'El mapa te espera', subtitle: '' },
] as const;

function PulsingHexagon({ color }: { color: string }) {
  const scale = useSharedValue(1);

  scale.value = withRepeat(
    withSequence(
      withTiming(1.06, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) })
    ),
    -1,
    false
  );

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={style}>
      <NenRadarChart profile={EMPTY_NEN_PROFILE} size={220} glowColor={color} showLabels={false} />
    </Animated.View>
  );
}

export default function TutorialScreen() {
  const router = useRouter();
  const { theme } = useAppContext();
  const listRef = useRef<FlatList<(typeof SLIDES)[number]>>(null);
  const [page, setPage] = useState(0);

  const finishTutorial = useCallback(async () => {
    await setTutorialCompleted(true);
    await requestAutoFocusMap();
    router.replace('/(tabs)');
  }, [router]);

  const skipTutorial = useCallback(async () => {
    await finishTutorial();
  }, [finishTutorial]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / SCREEN_W);
    if (next !== page) setPage(next);
  };

  const menuActions = buildNodeMenuActions(EXAMPLE_NODE, [EXAMPLE_NODE], {
    onAdoptGuide: () => {},
    onAddSubSkill: () => {},
    onAddXp: () => {},
    onDailyVerify: () => {},
    onShowInfo: () => {},
    onRenameNode: () => {},
    onDeleteNode: () => {},
    onCloseMenu: () => {},
  });

  return (
    <View style={[styles.root, { backgroundColor: SPACE_BG }]}>
      <Pressable style={styles.skipBtn} onPress={() => void skipTutorial()} hitSlop={12}>
        <Text style={[styles.skipText, { color: theme.textMuted }]}>Saltar</Text>
      </Pressable>

      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyExtractor={(item) => item.key}
        renderItem={({ item, index }) => (
          <View style={[styles.slide, { width: SCREEN_W }]}>
            <Text style={[styles.title, { color: theme.primary }]}>{item.title}</Text>

            {item.key === 'welcome' && (
              <>
                <Text style={[styles.subtitle, { color: theme.textMuted }]}>{item.subtitle}</Text>
                <Text style={[styles.body, { color: theme.text }]}>
                  Este es tu mapa de desarrollo humano. Cada orbe representa una habilidad real que
                  puedes practicar, dominar y evolucionar.
                </Text>
                <View style={styles.visualCenter}>
                  <PulsingHexagon color={theme.primary} />
                </View>
              </>
            )}

            {item.key === 'orbs' && (
              <>
                <View style={styles.orbDemo}>
                  <View style={styles.menuDemo}>
                    <NodeRadialMenu accentColor={theme.primary} actions={menuActions} />
                  </View>
                  <OrbVisual
                    rune="◆"
                    borderColor={theme.primary}
                    glowColor={theme.primary}
                    accentSecondary={theme.accent}
                    isActive
                    isGuide={false}
                    routineIntensity="active"
                    unlocked
                    decayRatio={1}
                  />
                </View>
                <View style={styles.legend}>
                  <Text style={[styles.legendItem, { color: theme.text }]}>
                    ✓ Check — Marca tu práctica de hoy. Se reinicia cada día.
                  </Text>
                  <Text style={[styles.legendItem, { color: theme.text }]}>
                    XP — Sube de nivel tu habilidad de forma permanente.
                  </Text>
                  <Text style={[styles.legendItem, { color: theme.text }]}>
                    i — Ve los detalles, tutoriales y tu historial.
                  </Text>
                  <Text style={[styles.legendItem, { color: theme.text }]}>
                    × — Envía la habilidad al Inframundo (recuperable).
                  </Text>
                </View>
              </>
            )}

            {item.key === 'nen' && (
              <>
                <Text style={[styles.body, { color: theme.text }]}>
                  El hexágono central mide tu balance real entre las 6 áreas de tu vida. Cada check
                  y cada XP mueve el polígono. Descubre tu tipo dominante.
                </Text>
                <View style={styles.visualCenter}>
                  <NenRadarChart profile={DEMO_PROFILE} size={260} glowColor={theme.accent} />
                </View>
              </>
            )}

            {item.key === 'start' && (
              <>
                <Text style={[styles.body, { color: theme.text }]}>
                  Toca cualquier orbe para empezar. Tu primer Check de hoy es suficiente.
                </Text>
                <Pressable
                  style={[styles.enterBtn, { backgroundColor: theme.primary }]}
                  onPress={() => void finishTutorial()}
                >
                  <Text style={styles.enterBtnText}>Entrar al mapa</Text>
                </Pressable>
              </>
            )}

            {index < SLIDES.length - 1 && item.key !== 'start' ? (
              <Text style={[styles.hint, { color: theme.textMuted }]}>Desliza →</Text>
            ) : null}
          </View>
        )}
      />

      <View style={styles.dots}>
        {SLIDES.map((slide, index) => (
          <View
            key={slide.key}
            style={[
              styles.dot,
              {
                backgroundColor: index === page ? theme.primary : theme.textMuted,
                opacity: index === page ? 1 : 0.35,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  skipBtn: {
    position: 'absolute',
    top: 52,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  slide: {
    flex: 1,
    paddingTop: 88,
    paddingHorizontal: 28,
    paddingBottom: 72,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 20,
  },
  visualCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbDemo: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 28,
    minHeight: 200,
  },
  menuDemo: {
    marginBottom: 12,
    alignItems: 'center',
  },
  legend: {
    gap: 10,
  },
  legendItem: {
    fontSize: 13,
    lineHeight: 19,
  },
  enterBtn: {
    marginTop: 32,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  enterBtnText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  hint: {
    textAlign: 'center',
    marginTop: 'auto',
    fontSize: 12,
  },
  dots: {
    position: 'absolute',
    bottom: 36,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
