/**
 * Verifica que las tablas de backup existen en Supabase.
 * Uso: node scripts/verify-supabase-schema.mjs
 * Requiere EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY en el entorno.
 */

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
};

async function probeTable(table) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=0`, { headers });
  const body = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    parsed = body;
  }
  return { table, status: res.status, body: parsed };
}

const tables = ['node_progress', 'nen_history_cloud'];
let allOk = true;

for (const table of tables) {
  const result = await probeTable(table);
  const missing =
    result.status === 404 ||
    (result.body?.code === 'PGRST205') ||
    String(result.body?.message ?? '').includes('Could not find the table');

  if (missing) {
    allOk = false;
    console.error(`❌ ${table}: NO EXISTE — aplica supabase/migrations/003_progress_sync.sql`);
  } else if (result.status >= 400 && result.body?.message === 'Invalid API key') {
    allOk = false;
    console.error('❌ API key inválida — revisa EXPO_PUBLIC_SUPABASE_ANON_KEY en .env');
    break;
  } else {
    console.log(`✅ ${table}: tabla accesible (HTTP ${result.status})`);
  }
}

if (allOk) {
  console.log('\nPara comprobar RLS en el dashboard de Supabase, ejecuta:');
  console.log(`SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('node_progress', 'nen_history_cloud');`);
}

process.exit(allOk ? 0 : 1);
