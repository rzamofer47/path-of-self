import { ROOT_SEEDS } from './rootSeeds';
import { getAuthUserId, getSupabase } from '@/src/lib/supabase';

export async function ensureProfileAndGuides(authId: string): Promise<void> {
  const supabase = getSupabase();

  const { data: profile } = await supabase
    .from('profiles')
    .select('auth_id')
    .eq('auth_id', authId)
    .maybeSingle();

  if (!profile) {
    await supabase.from('profiles').insert({ auth_id: authId });
  }

  const { count } = await supabase
    .from('nodes')
    .select('*', { count: 'exact', head: true })
    .eq('auth_id', authId);

  if ((count ?? 0) > 0) return;

  for (const root of ROOT_SEEDS) {
    await supabase.from('nodes').insert({
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
    });
  }
}

export async function prepareSupabaseUser(): Promise<string> {
  const authId = await getAuthUserId();
  await ensureProfileAndGuides(authId);
  return authId;
}
