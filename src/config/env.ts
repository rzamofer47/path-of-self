export function isSupabaseEnabled(): boolean {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && url.length > 0 && key.length > 0);
}

export function getStorageMode(): 'cloud' | 'local' {
  return isSupabaseEnabled() ? 'cloud' : 'local';
}
