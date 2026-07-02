import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useAppContext } from '@/src/context/AppContext';
import { isSupabaseEnabled } from '@/src/config/env';
import { SPACE_BG } from '@/src/utils/treeLayout';

export default function LoginScreen() {
  const { theme, signInWithGoogle, authAccount } = useAppContext();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authAccount) {
      router.replace('/(tabs)');
    }
  }, [authAccount, router]);

  if (!isSupabaseEnabled()) {
    return (
      <View style={[styles.root, { backgroundColor: SPACE_BG }]}>
        <Text style={[styles.title, { color: theme.primary }]}>Path of Self</Text>
        <Text style={[styles.body, { color: theme.textMuted }]}>
          Configura Supabase en `.env` para iniciar sesión y sincronizar entre dispositivos.
        </Text>
        <Pressable
          style={[styles.btn, { borderColor: theme.textMuted }]}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={[styles.btnText, { color: theme.text }]}>Continuar sin nube</Text>
        </Pressable>
      </View>
    );
  }

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      if (Platform.OS !== 'web') {
        router.replace('/(tabs)');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: SPACE_BG }]}>
      <Text style={[styles.kicker, { color: theme.textMuted }]}>PATH OF SELF</Text>
      <Text style={[styles.title, { color: theme.primary }]}>Tu progreso en la nube</Text>
      <Text style={[styles.body, { color: theme.text }]}>
        Inicia sesión con Google para acceder al mismo árbol desde tu laptop y tu móvil. Tu
        progreso local se sincroniza automáticamente.
      </Text>

      <Pressable
        style={[styles.googleBtn, loading && styles.btnDisabled]}
        onPress={() => void handleGoogleSignIn()}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#111" />
        ) : (
          <Text style={styles.googleBtnText}>Continuar con Google</Text>
        )}
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={[styles.hint, { color: theme.textMuted }]}>
        Los datos del mapa siguen guardándose en este dispositivo. La nube es tu respaldo
        entre equipos.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
  },
  googleBtn: {
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  googleBtnText: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '700',
  },
  btn: {
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  error: {
    color: '#ff6688',
    fontSize: 13,
    textAlign: 'center',
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
});
