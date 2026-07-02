import {
  buildSkillCatalogSeeds,
  CatalogNodeSeed,
} from '@/src/data/skillCatalogSeeds';
import { LEGACY_MENTAL_LOCKED_SLUGS } from '@/src/data/mentalEmotionalGalaxyCatalog';
import { LEGACY_PHYSICAL_LOCKED_SLUGS } from '@/src/data/physicalGalaxyCatalog';
import { LEGACY_PRODUCTIVE_LOCKED_SLUGS } from '@/src/data/productiveGalaxyCatalog';
import { mapNode } from './mappers';
import { AppDatabase } from './db.types';
import { decayCategoriaForSlug } from '@/src/utils/resolveNenDecayCategory';

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

/** Inserta o actualiza nodos `locked` del catálogo predefinido (disciplinas + guías). */
export async function syncCatalogNodes(db: AppDatabase): Promise<void> {
  const rows = await db.getAllAsync('SELECT * FROM nodes ORDER BY id ASC');
  const nodes = rows.map((row) => mapNode(row as Record<string, unknown>));
  const slugToId = new Map<string, number>();
  for (const node of nodes) {
    if (node.slug) slugToId.set(node.slug, node.id);
  }

  const seeds = orderSeedsByDependency(buildSkillCatalogSeeds(), slugToId);
  const seedSlugs = new Set(seeds.map((seed) => seed.slug));

  for (const legacySlug of [
    ...LEGACY_PHYSICAL_LOCKED_SLUGS,
    ...LEGACY_MENTAL_LOCKED_SLUGS,
    ...LEGACY_PRODUCTIVE_LOCKED_SLUGS,
  ]) {
    if (seedSlugs.has(legacySlug)) continue;
    const legacy = nodes.find((node) => node.slug === legacySlug && node.layer === 'locked');
    if (legacy) {
      await db.runAsync('DELETE FROM nodes WHERE id = ?', legacy.id);
    }
  }

  for (const seed of seeds) {
    const existing = nodes.find((n) => n.slug === seed.slug);
    const parentId = slugToId.get(seed.parentSlug);
    if (parentId == null) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn(
          `[syncCatalogNodes] Padre no resuelto para «${seed.slug}» → parentSlug=${seed.parentSlug}`
        );
      }
      continue;
    }

    const youtubeUrl = seed.youtubeUrl ?? seed.guideUrl ?? null;
    const colorRole = seed.colorRole ?? 'standard';
    const decayCategoria = decayCategoriaForSlug(seed.slug);

    if (existing) {
      if (existing.layer === 'locked') {
        await db.runAsync(
          `UPDATE nodes SET
            name = ?,
            type = ?,
            macro_area = ?,
            pos_x = ?,
            pos_y = ?,
            parent_id = ?,
            guide_url = ?,
            color_role = ?,
            origin_pos_x = ?,
            origin_pos_y = ?,
            decay_categoria = ?
           WHERE id = ?`,
          seed.name,
          seed.type,
          seed.macroArea,
          seed.posX,
          seed.posY,
          parentId,
          youtubeUrl,
          colorRole,
          seed.posX,
          seed.posY,
          decayCategoria,
          existing.id
        );
        slugToId.set(seed.slug, existing.id);
      }
      continue;
    }

    const result = await db.runAsync(
      `INSERT INTO nodes (
        name, type, layer, macro_area, xp, level,
        pos_x, pos_y, parent_id, slug, guide_url, color_role, origin_pos_x, origin_pos_y, decay_categoria
      ) VALUES (?, ?, 'locked', ?, 0, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      seed.name,
      seed.type,
      seed.macroArea,
      seed.posX,
      seed.posY,
      parentId,
      seed.slug,
      youtubeUrl,
      colorRole,
      seed.posX,
      seed.posY,
      decayCategoria
    );

    slugToId.set(seed.slug, result.lastInsertRowId);
  }
}

/** @deprecated Usar syncCatalogNodes */
export const seedCatalogNodes = syncCatalogNodes;
