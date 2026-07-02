import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, Session, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { isSupabaseEnabled } from '@/src/config/env';

let client: SupabaseClient | null = null;

const storageAdapter =
  Platform.OS === 'web'
    ? undefined
    : {
        getItem: (key: string) => AsyncStorage.getItem(key),
        setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
        removeItem: (key: string) => AsyncStorage.removeItem(key),
      };

export function getSupabase(): SupabaseClient {
  if (!isSupabaseEnabled()) {
    throw new Error('Supabase no está configurado. Añade EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  if (!client) {
    client = createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL!,
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storage: storageAdapter,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: Platform.OS === 'web',
          flowType: 'pkce',
        },
      }
    );
  }

  return client;
}

export async function getSupabaseSession(): Promise<Session | null> {
  if (!isSupabaseEnabled()) return null;
  const { data } = await getSupabase().auth.getSession();
  return data.session;
}

/** Devuelve el auth_id solo si hay sesión activa (Google u otro proveedor). */
export async function ensureSupabaseSession(): Promise<string | null> {
  const session = await getSupabaseSession();
  return session?.user.id ?? null;
}

export async function getAuthUserId(): Promise<string> {
  const authId = await ensureSupabaseSession();
  if (!authId) {
    throw new Error('Debes iniciar sesión con Google para usar la nube');
  }
  return authId;
}

export function onSupabaseAuthStateChange(
  callback: (session: Session | null) => void
): () => void {
  if (!isSupabaseEnabled()) return () => {};

  const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return () => data.subscription.unsubscribe();
}
