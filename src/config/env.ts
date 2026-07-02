import Constants from 'expo-constants';

function isValidHttpUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export type SupabaseCredentialSource = 'process.env' | 'expo.extra' | 'none';

export function readSupabaseCredentials(): {
  url: string;
  key: string;
  source: SupabaseCredentialSource;
} {
  const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined;

  const processUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const processKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
  const extraUrl = extra?.supabaseUrl?.trim() ?? '';
  const extraKey = extra?.supabaseAnonKey?.trim() ?? '';

  // Preferir JWT anon (eyJ) sobre sb_publishable si Metro cacheó una clave vieja.
  const pickKey = (): { key: string; source: SupabaseCredentialSource } => {
    const candidates: { key: string; source: SupabaseCredentialSource }[] = [];
    if (processKey) candidates.push({ key: processKey, source: 'process.env' });
    if (extraKey && extraKey !== processKey) {
      candidates.push({ key: extraKey, source: 'expo.extra' });
    }
    if (candidates.length === 0) return { key: '', source: 'none' };

    const jwt = candidates.find((c) => c.key.startsWith('eyJ'));
    if (jwt) return jwt;

    return candidates[0];
  };

  const picked = pickKey();
  const url = processUrl || extraUrl;

  return { url, key: picked.key, source: picked.source };
}

function readEnv(name: 'EXPO_PUBLIC_SUPABASE_URL' | 'EXPO_PUBLIC_SUPABASE_ANON_KEY'): string | undefined {
  const { url, key } = readSupabaseCredentials();
  if (name === 'EXPO_PUBLIC_SUPABASE_URL') return url || undefined;
  return key || undefined;
}

export function isSupabaseEnabled(): boolean {
  const url = readEnv('EXPO_PUBLIC_SUPABASE_URL');
  const key = readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  return Boolean(url && key && isValidHttpUrl(url) && key.length > 0);
}

/** Mensaje claro si la URL de Supabase está mal (p. ej. placeholder EAS o sin https://). */
export function getSupabaseConfigError(): string | null {
  const url = readEnv('EXPO_PUBLIC_SUPABASE_URL');
  const key = readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  if (!url && !key) return null;
  if (!url || !key) {
    return 'Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY en .env / EAS.';
  }
  if (!isValidHttpUrl(url)) {
    return `EXPO_PUBLIC_SUPABASE_URL debe ser http(s)://… (valor actual: "${url}"). No uses placeholders como tu_url_de_supabase.`;
  }
  if (key.startsWith('sb_publishable_')) {
    return (
      'EXPO_PUBLIC_SUPABASE_ANON_KEY usa sb_publishable_… y Supabase responde "Invalid API key". ' +
      'En Dashboard → Project Settings → API copia la clave anon public (JWT que empieza con eyJhbGci), guarda .env y reinicia con npx expo start --clear.'
    );
  }
  return null;
}

export function getStorageMode(): 'cloud' | 'local' {
  return isSupabaseEnabled() ? 'cloud' : 'local';
}
