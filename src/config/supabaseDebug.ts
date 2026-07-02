import Constants from 'expo-constants';

import { readSupabaseCredentials } from '@/src/config/env';

/** Solo desarrollo: muestra de dónde sale la clave anon (sin exponer el valor completo). */
export function logSupabaseConfigDebug(): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;

  const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined;
  const fromProcessUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const fromProcessKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const fromExtraUrl = extra?.supabaseUrl?.trim();
  const fromExtraKey = extra?.supabaseAnonKey?.trim();
  const resolved = readSupabaseCredentials();

  console.log('[Supabase config] URL process.env:', fromProcessUrl ?? '(vacío)');
  console.log('[Supabase config] URL extra:', fromExtraUrl ?? '(vacío)');
  console.log('[Supabase config] URL en uso:', resolved.url || '(vacío)');

  console.log(
    '[Supabase config] ANON KEY process.env:',
    fromProcessKey ? `${fromProcessKey.slice(0, 20)}… (len=${fromProcessKey.length})` : '(vacío)'
  );
  console.log(
    '[Supabase config] ANON KEY extra:',
    fromExtraKey ? `${fromExtraKey.slice(0, 20)}… (len=${fromExtraKey.length})` : '(vacío)'
  );
  console.log(
    '[Supabase config] ANON KEY en uso:',
    resolved.key ? `${resolved.key.slice(0, 20)}… (len=${resolved.key.length}, ${describeKeyFormat(resolved.key)})` : '(vacío)'
  );
  console.log('[Supabase config] Fuente en uso:', resolved.source);
}

function describeKeyFormat(key: string): string {
  if (key.startsWith('eyJ')) return 'JWT anon ✓';
  if (key.startsWith('sb_publishable_')) return 'sb_publishable ✗ (usa eyJ anon)';
  return 'formato desconocido';
}
