import { ROOT_SEEDS } from './rootSeeds';
import {
  syncCatalogNodesToSupabase,
  syncWildcardNodesToSupabase,
} from './supabaseCatalogSync';
import { ensureSupabaseSession, getSupabase } from '@/src/lib/supabase';

/** Crea el perfil en `profiles` si el usuario acaba de autenticarse. */
export async function ensureProfile(authId: string): Promise<void> {
  const supabase = getSupabase();

  const { data: profile, error: selectError } = await supabase
    .from('profiles')
    .select('auth_id')
    .eq('auth_id', authId)
    .maybeSingle();

  if (selectError) throw selectError;
  if (profile) return;

  const { error: insertError } = await supabase.from('profiles').insert({ auth_id: authId });
  if (insertError) throw insertError;
}

/** Inserta los 6 nodos madre Nen para un usuario nuevo en la nube. */
export async function seedInitialNodes(authId: string): Promise<void> {
  const supabase = getSupabase();

  for (const root of ROOT_SEEDS) {
    const { error } = await supabase.from('nodes').insert({
      auth_id: authId,
      name: root.name,
      type: root.type,
      layer: 'root',
      macro_area: root.macroArea,
      xp: 10,
      level: 1,
      pos_x: root.posX,
      pos_y: root.posY,
      slug: root.slug,
      guide_url: null,
      origin_pos_x: root.posX,
      origin_pos_y: root.posY,
    });

    if (error) throw error;
  }

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log(`[Supabase seed] ${ROOT_SEEDS.length} nodos madre insertados para ${authId}`);
  }
}

/** Una sola vez por usuario autenticado: si no tiene nodos, siembra el árbol inicial. */
export async function ensureInitialNodes(authId: string): Promise<void> {
  const supabase = getSupabase();

  const { count, error } = await supabase
    .from('nodes')
    .select('*', { count: 'exact', head: true })
    .eq('auth_id', authId);

  if (error) throw error;
  if ((count ?? 0) > 0) return;

  await seedInitialNodes(authId);
}

/** Perfil + árbol completo (raíces + catálogo + comodines) para usuarios Google. */
export async function ensureProfileAndGuides(authId: string): Promise<void> {
  await ensureProfile(authId);
  await ensureInitialNodes(authId);

  const catalogInserted = await syncCatalogNodesToSupabase(authId);
  const wildcardsInserted = await syncWildcardNodesToSupabase(authId);

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    const supabase = getSupabase();
    const { count } = await supabase
      .from('nodes')
      .select('*', { count: 'exact', head: true })
      .eq('auth_id', authId);
    console.log(
      `[Supabase seed] árbol listo — total nodos: ${count ?? 0}, catálogo +${catalogInserted}, comodines +${wildcardsInserted}`
    );
  }
}

export async function prepareSupabaseUser(): Promise<string> {
  const authId = await ensureSupabaseSession();
  if (!authId) {
    throw new Error('Debes iniciar sesión con Google para usar la nube');
  }

  await ensureProfileAndGuides(authId);
  return authId;
}
