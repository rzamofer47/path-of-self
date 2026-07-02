/** Convierte errores de Supabase OAuth en mensajes accionables para el usuario. */
export function formatAuthError(err: unknown): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : JSON.stringify(err);

  const lower = raw.toLowerCase();

  if (
    lower.includes('provider is not enabled') ||
    lower.includes('unsupported provider')
  ) {
    return (
      'Google no está activado en tu proyecto Supabase. Ve a Authentication → Providers → Google, ' +
      'actívalo y pega el Client ID y Client Secret de Google Cloud Console.'
    );
  }

  if (lower.includes('redirect') && lower.includes('url')) {
    return (
      'URL de retorno no registrada. En Supabase → Authentication → URL Configuration añade ' +
      'http://localhost:8081/auth/callback a Redirect URLs.'
    );
  }

  return raw;
}
