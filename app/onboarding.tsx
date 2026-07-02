import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { completeOnboarding } from '@/src/database/queryEngine';
import { useAppContext } from '@/src/context/AppContext';
import { OnboardingAnswers, UserProfile } from '@/src/types';

const QUESTIONS = [
  {
    id: 'ageRange' as const,
    title: '¿Cuál es tu rango de edad?',
    options: [
      { value: 'young' as UserProfile, label: 'Menor de 30 años (Perfil Joven)' },
      { value: 'adult' as UserProfile, label: '30 años o más (Perfil Adulto)' },
    ],
  },
  {
    id: 'practiceFrequency' as const,
    title: '¿Con qué frecuencia practicas habilidades?',
    options: [
      { value: 'daily' as const, label: 'Diariamente' },
      { value: 'weekly' as const, label: 'Varias veces por semana' },
      { value: 'occasional' as const, label: 'Ocasionalmente' },
    ],
  },
  {
    id: 'focusPreference' as const,
    title: '¿Qué área te interesa más?',
    options: [
      { value: 'physical' as const, label: 'Física (deporte, salud)' },
      { value: 'intellectual' as const, label: 'Intelectual (estudio, lectura)' },
      { value: 'balanced' as const, label: 'Equilibrio entre ambas' },
    ],
  },
  {
    id: 'retentionConcern' as const,
    title: '¿Te preocupa olvidar lo que aprendes?',
    options: [
      { value: true, label: 'Sí, olvido rápido lo que no practico' },
      { value: false, label: 'No, retengo bien con poca práctica' },
    ],
  },
  {
    id: 'goalType' as const,
    title: '¿Cuál es tu objetivo principal?',
    options: [
      { value: 'mastery' as const, label: 'Dominar pocas habilidades a fondo' },
      { value: 'maintenance' as const, label: 'Mantener un nivel constante' },
      { value: 'exploration' as const, label: 'Explorar muchas áreas nuevas' },
    ],
  },
];

type Answers = Partial<OnboardingAnswers>;

export default function OnboardingScreen() {
  const router = useRouter();
  const { refreshUser, theme } = useAppContext();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [submitting, setSubmitting] = useState(false);

  const question = QUESTIONS[step];
  const progress = ((step + 1) / QUESTIONS.length) * 100;

  const handleSelect = (value: unknown) => {
    const updated = { ...answers, [question.id]: value };
    setAnswers(updated);

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      finishOnboarding(updated as OnboardingAnswers);
    }
  };

  const finishOnboarding = async (finalAnswers: OnboardingAnswers) => {
    setSubmitting(true);
    try {
      await completeOnboarding(finalAnswers);
      await refreshUser();
      router.replace('/(tabs)');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitting) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textMuted }]}>
          Calibrando tu perfil...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.header, { color: theme.primary }]}>Iniciación del Aventurero</Text>
      <Text style={[styles.subheader, { color: theme.textMuted }]}>
        Pregunta {step + 1} de {QUESTIONS.length}
      </Text>

      <View style={[styles.progressBar, { backgroundColor: theme.surface }]}>
        <View
          style={[styles.progressFill, { width: `${progress}%`, backgroundColor: theme.primary }]}
        />
      </View>

      <Text style={[styles.question, { color: theme.text }]}>{question.title}</Text>

      {question.options.map((option) => (
        <Pressable
          key={String(option.value)}
          style={[styles.option, { backgroundColor: theme.surface, borderColor: theme.primary }]}
          onPress={() => handleSelect(option.value)}
        >
          <Text style={[styles.optionText, { color: theme.text }]}>{option.label}</Text>
        </Pressable>
      ))}

      {step > 0 && (
        <Pressable style={styles.backButton} onPress={() => setStep(step - 1)}>
          <Text style={{ color: theme.textMuted }}>← Anterior</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 60,
  },
  header: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  subheader: {
    fontSize: 14,
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 32,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  question: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 24,
    lineHeight: 28,
  },
  option: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  optionText: {
    fontSize: 16,
  },
  backButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
});
