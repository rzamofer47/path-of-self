import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { getSupabase } from '@/src/lib/supabase';
import { formatAuthError } from '@/src/lib/authErrors';

WebBrowser.maybeCompleteAuthSession();

export interface SupabaseAuthAccount {
  id: string;
  email: string | null;
}

/** URI de retorno registrada en Supabase y Google Cloud Console. */
export function getAuthRedirectUri(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`;
  }

  return makeRedirectUri({
    scheme: 'rpgskilltree',
    path: 'auth/callback',
  });
}

export async function getSupabaseAuthAccount(): Promise<SupabaseAuthAccount | null> {
  const { data } = await getSupabase().auth.getSession();
  const user = data.session?.user;
  if (!user) return null;
  return { id: user.id, email: user.email ?? null };
}

export async function createSessionFromUrl(url: string): Promise<void> {
  const supabase = getSupabase();
  const { params, errorCode } = QueryParams.getQueryParams(url);

  if (errorCode) {
    throw new Error(String(errorCode));
  }

  if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(String(params.code));
    if (error) throw error;
    return;
  }

  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: String(accessToken),
      refresh_token: String(refreshToken),
    });
    if (error) throw error;
  }
}

export async function signInWithGoogle(): Promise<void> {
  const supabase = getSupabase();
  const redirectTo = getAuthRedirectUri();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: Platform.OS !== 'web',
      queryParams: {
        prompt: 'select_account',
      },
    },
  });

  if (error) throw new Error(formatAuthError(error));

  if (Platform.OS === 'web') {
    if (data?.url && typeof window !== 'undefined') {
      window.location.href = data.url;
    }
    return;
  }

  if (!data?.url) {
    throw new Error('No se recibió URL de autenticación de Supabase');
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
    showInRecents: true,
  });

  if (result.type !== 'success' || !result.url) {
    throw new Error('Inicio de sesión cancelado');
  }

  await createSessionFromUrl(result.url);
}

export async function signOutFromGoogle(): Promise<void> {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw error;
}
