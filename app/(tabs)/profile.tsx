import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ProfileConstellationSummary } from '@/src/components/profile/ProfileConstellationSummary';
import { useAppContext } from '@/src/context/AppContext';
import { getAreaLevels } from '@/src/database/queryEngine';
import { useDecayEngine } from '@/src/hooks/useDecayEngine';
import { AREA_LABELS, useStatusEngine } from '@/src/hooks/useStatusEngine';
import {
  FOCUS_PREFERENCE_LABELS,
  GOAL_TYPE_LABELS,
  PRACTICE_FREQUENCY_LABELS,
} from '@/src/utils/onboardingLabels';
import { generateProfileSummary } from '@/src/utils/profileSummary';
import { MacroArea, OnboardingAnswers } from '@/src/types';

function userToOnboardingAnswers(user: NonNullable<ReturnType<typeof useAppContext>['user']>): OnboardingAnswers | null {
  if (!user.onboardingComplete || !user.practiceFrequency || !user.focusPreference || !user.goalType) {
    return null;
  }
  return {
    ageRange: user.profile,
    practiceFrequency: user.practiceFrequency,
    focusPreference: user.focusPreference,
    retentionConcern: user.retentionConcern ?? false,
    goalType: user.goalType,
  };
}

export default function ProfileScreen() {
  const { theme, user } = useAppContext();
  const { nodes, loading } = useDecayEngine();
  const [areaLevels, setAreaLevels] = useState<Record<MacroArea, number> | null>(null);
  const status = useStatusEngine(areaLevels, nodes, user);

  useEffect(() => {
    getAreaLevels().then(setAreaLevels);
  }, [nodes]);

  if (loading || !status || !user) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const profileLabel = user.profile === 'young' ? 'Perfil Joven' : 'Perfil Adulto';
  const onboardingAnswers = userToOnboardingAnswers(user);
  const profileSummary = onboardingAnswers ? generateProfileSummary(onboardingAnswers) : null;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>CLASE ACTIVA</Text>
        <Text style={[styles.title, { color: theme.primary }]}>{status.activeTitle}</Text>
        {status.legacyTitle && status.legacyTags.length > 0 && (
          <Text style={[styles.legacyTitle, { color: theme.textMuted }]}>
            Legado: {status.legacyTitle}
          </Text>
        )}
        {status.legacyTags.length > 0 && (
          <View style={styles.legacyRow}>
            {status.legacyTags.map((tag) => (
              <View
                key={tag}
                style={[styles.legacyTag, { backgroundColor: theme.legacyTag }]}
              >
                <Text style={styles.legacyText}>[{tag}]</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Constelaciones</Text>
        <ProfileConstellationSummary nodes={nodes} user={user} theme={theme} />
        <Text style={[styles.stat, { color: theme.textMuted }]}>
          Brillo = salud promedio de tus habilidades custom por macro-área
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Perfil del Test</Text>
        {profileSummary && (
          <Text style={[styles.summary, { color: theme.text }]}>{profileSummary}</Text>
        )}
        <Text style={[styles.stat, { color: theme.textMuted, marginTop: profileSummary ? 12 : 0 }]}>
          {profileLabel} · XP ×{user.xpGainModifier.toFixed(2)} · Degradación ×
          {user.decaySpeedModifier.toFixed(2)}
        </Text>
        {user.retentionShield && (
          <Text style={[styles.shield, { color: theme.accent }]}>
            Escudo de Retención activo (2× gracia antes de oxidación)
          </Text>
        )}
        {user.onboardingComplete && user.practiceFrequency && (
          <>
            <Text style={[styles.stat, { color: theme.textMuted, marginTop: 12 }]}>
              Frecuencia: {PRACTICE_FREQUENCY_LABELS[user.practiceFrequency]}
            </Text>
            {user.focusPreference && (
              <Text style={[styles.stat, { color: theme.textMuted }]}>
                Enfoque: {FOCUS_PREFERENCE_LABELS[user.focusPreference]}
              </Text>
            )}
            {user.goalType && (
              <Text style={[styles.stat, { color: theme.textMuted }]}>
                Objetivo: {GOAL_TYPE_LABELS[user.goalType]}
              </Text>
            )}
            {user.retentionConcern != null && (
              <Text style={[styles.stat, { color: theme.textMuted }]}>
                Retención: {user.retentionConcern ? 'Preocupación alta' : 'Retención estable'}
              </Text>
            )}
          </>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Rangos por Área</Text>
        {(Object.entries(status.areaLevels) as [MacroArea, number][]).map(([area, level]) => (
          <View key={area} style={styles.areaRow}>
            <Text style={[styles.areaName, { color: theme.text }]}>
              {AREA_LABELS[area]}
            </Text>
            <View style={[styles.levelBar, { backgroundColor: theme.background }]}>
              <View
                style={[
                  styles.levelFill,
                  {
                    width: `${Math.min(100, level * 10)}%`,
                    backgroundColor: theme.primary,
                  },
                ]}
              />
            </View>
            <Text style={[styles.levelText, { color: theme.textMuted }]}>Nv. {level}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Áreas Dominantes</Text>
        <Text style={[styles.dominant, { color: theme.secondary }]}>
          {status.dominantAreas.map((a) => AREA_LABELS[a]).join(' + ')}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
  },
  legacyTitle: {
    fontSize: 15,
    fontStyle: 'italic',
    marginTop: 6,
  },
  legacyRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  legacyTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  legacyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  summary: {
    fontSize: 14,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  stat: {
    fontSize: 14,
    lineHeight: 22,
  },
  shield: {
    fontSize: 13,
    marginTop: 8,
    fontWeight: '600',
  },
  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  areaName: {
    width: 120,
    fontSize: 13,
  },
  levelBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  levelFill: {
    height: '100%',
    borderRadius: 4,
  },
  levelText: {
    width: 40,
    fontSize: 12,
    textAlign: 'right',
  },
  dominant: {
    fontSize: 18,
    fontWeight: '600',
  },
});
