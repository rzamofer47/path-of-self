import { buildSkillCatalogSeeds, CatalogNodeSeed } from '@/src/data/skillCatalogSeeds';
import { WILDCARD_SEEDS, resolveWildcardSeedPlacement } from '@/src/data/wildcardSeeds';
import { getSupabase } from '@/src/lib/supabase';
import { decayCategoriaForSlug } from '@/src/utils/resolveNenDecayCategory';
import { SkillNode } from '@/src/types';

import { mapNode } from './mappers';

function orderSeedsByDependency(
  seeds: CatalogNodeSeed[],
  slugToId: Map<string, number>
): CatalogNodeSeed[] {
  const ordered: CatalogNodeSeed[] = [];
  const pending = [...seeds];
  const resolved = new Set(slugToId.keys());

  while (pending.length > 0) {
    const nextIndex = pending.findIndex((seed) => resolved.has(seed.parentSlug));
    if (nextIndex < 0) break;
    const [next] = pending.splice(nextIndex, 1);
    ordered.push(next);
    resolved.add(next.slug);
  }

  return [...ordered, ...pending];
}

function mapSupabaseNodeRow(row: Record<string, unknown>): SkillNode {
  return mapNode({
    id: row.id,
    slug: row.slug,
    name: row.name,
    type: row.type,
    layer: row.layer,
    macro_area: row.macro_area,
    xp: row.xp,
    level: row.level,
    pos_x: row.pos_x,
    pos_y: row.pos_y,
    parent_id: row.parent_id,
    guide_url: row.guide_url,
    origin_pos_x: row.origin_pos_x,
    origin_pos_y: row.origin_pos_y,
    is_deleted: row.is_deleted,
    created_at: row.created_at,
  });
}

/** Inserta nodos `locked` del catálogo que falten en la nube para este usuario. */
export async function syncCatalogNodesToSupabase(authId: string): Promise<number> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('nodes')
    .select('*')
    .eq('auth_id', authId)
    .order('id', { ascending: true });

  if (error) throw error;

  const nodes = (data ?? []).map((row) => mapSupabaseNodeRow(row as Record<string, unknown>));
  const slugToId = new Map<string, number>();
  for (const node of nodes) {
    if (node.slug) slugToId.set(node.slug, node.id);
  }

  const seeds = orderSeedsByDependency(buildSkillCatalogSeeds(), slugToId);
  let inserted = 0;

  for (const seed of seeds) {
    const existing = nodes.find((n) => n.slug === seed.slug);
    const parentId = slugToId.get(seed.parentSlug);
    if (parentId == null) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn(
          `[Supabase catalog] Padre no resuelto para «${seed.slug}» → parentSlug=${seed.parentSlug}`
        );
      }
      continue;
    }

    if (existing) {
      if (existing.layer === 'locked') {
        slugToId.set(seed.slug, existing.id);
      }
      continue;
    }

    const youtubeUrl = seed.youtubeUrl ?? seed.guideUrl ?? null;
    const { data: created, error: insertError } = await supabase
      .from('nodes')
      .insert({
        auth_id: authId,
        name: seed.name,
        type: seed.type,
        layer: 'locked',
        macro_area: seed.macroArea,
        xp: 0,
        level: 1,
        pos_x: seed.posX,
        pos_y: seed.posY,
        parent_id: parentId,
        slug: seed.slug,
        guide_url: youtubeUrl,
        origin_pos_x: seed.posX,
        origin_pos_y: seed.posY,
      })
      .select('id, slug')
      .single();

    if (insertError) throw insertError;

    const newId = Number(created?.id);
    if (Number.isFinite(newId)) {
      slugToId.set(seed.slug, newId);
      inserted += 1;
    }
  }

  return inserted;
}

/** Inserta nodos comodín por macro-área si faltan en la nube. */
export async function syncWildcardNodesToSupabase(authId: string): Promise<number> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('nodes')
    .select('*')
    .eq('auth_id', authId)
    .order('id', { ascending: true });

  if (error) throw error;

  const nodes = (data ?? []).map((row) => mapSupabaseNodeRow(row as Record<string, unknown>));
  let inserted = 0;

  for (const seed of WILDCARD_SEEDS) {
    const existing = nodes.find(
      (n) => n.slug === seed.slug || (n.layer === 'wildcard' && n.macroArea === seed.macroArea)
    );

    const placement = resolveWildcardSeedPlacement(nodes, seed.macroArea);
    if (placement.parentId == null) continue;

    if (existing) continue;

    const { data: created, error: insertError } = await supabase
      .from('nodes')
      .insert({
        auth_id: authId,
        name: seed.name,
        type: seed.type,
        layer: 'wildcard',
        macro_area: seed.macroArea,
        xp: 0,
        level: 1,
        pos_x: placement.posX,
        pos_y: placement.posY,
        parent_id: placement.parentId,
        slug: seed.slug,
        guide_url: null,
        origin_pos_x: placement.posX,
        origin_pos_y: placement.posY,
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    if (created) {
      inserted += 1;
      nodes.push({
        id: Number(created.id),
        slug: seed.slug,
        name: seed.name,
        type: seed.type,
        layer: 'wildcard',
        macroArea: seed.macroArea,
        xp: 0,
        level: 1,
        posX: placement.posX,
        posY: placement.posY,
        parentId: placement.parentId,
        guideUrl: null,
        originPosX: placement.posX,
        originPosY: placement.posY,
        isDeleted: false,
        lastPracticeAt: null,
        weeklyXpSessions: 0,
        weekStartAt: null,
        dailyVerifiedAt: null,
        decayCategoria: decayCategoriaForSlug(seed.slug),
        sessionQuality: null,
        sessionQualityHistory: null,
        colorRole: null,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return inserted;
}
