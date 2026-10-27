import { recomputeCustomNodePositions } from '@/src/utils/polarLayout';
import { getCatalogParentSlug } from '@/src/data/skillCatalogSeeds';
import { WILDCARD_SEEDS, resolveWildcardSeedPlacement } from '@/src/data/wildcardSeeds';
import { syncCatalogNodes } from './catalogSeeds';
import {
  logSectorAuditBeforeMigration,
  migrateAllNodePositions,
} from './nodePositionMigration';
import { mapNode } from './mappers';
import { backfillNodeDecayCategories } from './backfillNodeDecayCategories';
import { AppDatabase } from './db.types';
import { ROOT_SEEDS } from './rootSeeds';
import {
  LEGACY_ROOT_SLUG_TO_NEN,
  NEN_MOTHER_SLUG_BY_ID,
  NEN_ROOT_SLUG_BY_MACRO,
} from '@/src/config/nenMotherRoots';
import { SkillNode } from '@/src/types';

export { GUIDE_SEEDS, ROOT_SEEDS } from './rootSeeds';

export async function seedRootNodes(db: AppDatabase): Promise<void> {
  for (const root of ROOT_SEEDS) {
    await db.runAsync(
      `INSERT INTO nodes (name, type, layer, macro_area, xp, level, pos_x, pos_y, slug, guide_url)
       VALUES (?, ?, 'root', ?, 10, 1, ?, ?, ?, NULL)`,
      root.name,
      root.type,
      root.macroArea,
      root.posX,
      root.posY,
      root.slug
    );
  }
}

/** @deprecated Usar seedRootNodes */
export const seedGuideNodes = seedRootNodes;

/** Sincroniza metadatos de nodos raíz Nen (nombre, slug, posición en hexágono). */
export async function syncRootNodes(db: AppDatabase): Promise<void> {
  await db.execAsync(`UPDATE nodes SET layer = 'root' WHERE layer = 'guide'`);

  for (const [legacySlug, nenSlug] of Object.entries(LEGACY_ROOT_SLUG_TO_NEN)) {
    const target = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM nodes WHERE slug = ? AND layer IN ('root', 'guide') LIMIT 1`,
      nenSlug
    );
    const legacy = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM nodes WHERE slug = ? AND layer IN ('root', 'guide') LIMIT 1`,
      legacySlug
    );
    if (!legacy) continue;

    if (target) {
      await db.runAsync(`UPDATE nodes SET parent_id = ? WHERE parent_id = ?`, target.id, legacy.id);
      await db.runAsync(`DELETE FROM nodes WHERE id = ?`, legacy.id);
    } else {
      await db.runAsync(
        `UPDATE nodes SET slug = ?, layer = 'root' WHERE id = ?`,
        nenSlug,
        legacy.id
      );
    }
  }

  for (const root of ROOT_SEEDS) {
    const existing = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM nodes WHERE slug = ? LIMIT 1`,
      root.slug
    );

    if (existing) {
      await db.runAsync(
        `UPDATE nodes SET name = ?, type = ?, layer = 'root', macro_area = ?, slug = ?, pos_x = ?, pos_y = ?, guide_url = NULL WHERE id = ?`,
        root.name,
        root.type,
        root.macroArea,
        root.slug,
        root.posX,
        root.posY,
        existing.id
      );
    } else {
      await db.runAsync(
        `INSERT INTO nodes (name, type, layer, macro_area, xp, level, pos_x, pos_y, slug, guide_url)
         VALUES (?, ?, 'root', ?, 10, 1, ?, ?, ?, NULL)`,
        root.name,
        root.type,
        root.macroArea,
        root.posX,
        root.posY,
        root.slug
      );
    }
  }
}

/** @deprecated Usar syncRootNodes */
export const syncGuideNodePositions = syncRootNodes;

/** Inserta un nodo comodín por macro-área si aún no existe. */
export async function syncWildcardNodes(db: AppDatabase): Promise<void> {
  const rows = await db.getAllAsync('SELECT * FROM nodes ORDER BY id ASC');
  const nodes = rows.map((row) => mapNode(row as Record<string, unknown>));

  for (const seed of WILDCARD_SEEDS) {
    const existing = nodes.find(
      (n) => n.slug === seed.slug || (n.layer === 'wildcard' && n.macroArea === seed.macroArea)
    );

    const placement = resolveWildcardSeedPlacement(nodes, seed.macroArea);
    if (placement.parentId == null) continue;

    if (existing) {
      await db.runAsync(
        `UPDATE nodes SET pos_x = ?, pos_y = ?, parent_id = ?, origin_pos_x = ?, origin_pos_y = ? WHERE id = ?`,
        placement.posX,
        placement.posY,
        placement.parentId,
        placement.posX,
        placement.posY,
        existing.id
      );
      continue;
    }

    await db.runAsync(
      `INSERT INTO nodes (name, type, layer, macro_area, pos_x, pos_y, parent_id, slug, guide_url, origin_pos_x, origin_pos_y)
       VALUES (?, ?, 'wildcard', ?, ?, ?, ?, ?, NULL, ?, ?)`,
      seed.name,
      seed.type,
      seed.macroArea,
      placement.posX,
      placement.posY,
      placement.parentId,
      seed.slug,
      placement.posX,
      placement.posY
    );

    nodes.push({
      id: -1,
      slug: seed.slug,
      name: seed.name,
      type: seed.type,
      layer: 'wildcard',
      macroArea: seed.macroArea,
      xp: 0,
      level: 1,
      posX: placement.posX,
      posY: placement.posY,
      lastPracticeAt: null,
      dailyVerifiedAt: null,
      weeklyXpSessions: 0,
      weekStartAt: null,
      guideUrl: null,
      colorRole: null,
      parentId: placement.parentId,
      originPosX: placement.posX,
      originPosY: placement.posY,
      isDeleted: false,
      decayCategoria: null,
      sessionQuality: null,
      sessionQualityHistory: null,
      createdAt: new Date().toISOString(),
    });
  }
}

/** Asigna parent_id a nodos custom/locked huérfanos según el catálogo. */
export async function syncCustomNodeParentIds(db: AppDatabase): Promise<void> {
  const rows = await db.getAllAsync('SELECT * FROM nodes ORDER BY id ASC');
  if (rows.length === 0) return;

  const nodes = rows.map((row) => mapNode(row as Record<string, unknown>));
  const slugToId = new Map<string, number>();
  for (const node of nodes) {
    if (node.slug) slugToId.set(node.slug, node.id);
  }

  for (const node of nodes) {
    if (node.layer !== 'custom' && node.layer !== 'locked') continue;
    if (!node.slug) continue;

    const expectedParentSlug = getCatalogParentSlug(node.slug);
    if (!expectedParentSlug) continue;

    const expectedParentId = slugToId.get(expectedParentSlug);
    if (expectedParentId == null || node.parentId === expectedParentId) continue;

    await db.runAsync('UPDATE nodes SET parent_id = ? WHERE id = ?', expectedParentId, node.id);
  }
}

function resolveOrphanParentSlug(node: SkillNode): string {
  if (node.slug) {
    const catalogParent = getCatalogParentSlug(node.slug);
    if (catalogParent) return catalogParent;
  }

  const slug = (node.slug ?? '').toLowerCase();
  const name = node.name.toLowerCase();
  const haystack = `${slug} ${name}`;

  if (node.macroArea === 'mental_emotional') {
    if (haystack.includes('phil') || haystack.includes('filosof') || haystack.includes('estoic')) {
      return 'discipline_specialization_filosofia';
    }
    if (
      haystack.includes('read') ||
      haystack.includes('lectura') ||
      haystack.includes('cierre') ||
      haystack.includes('dicotomia') ||
      haystack.includes('perspectiva')
    ) {
      return 'discipline_specialization_lectura';
    }
    return NEN_MOTHER_SLUG_BY_ID.specialization;
  }

  return NEN_ROOT_SLUG_BY_MACRO[node.macroArea];
}

function isOrphanedNode(node: SkillNode, validIds: Set<number>): boolean {
  if (node.layer === 'root' || node.layer === 'wildcard') return false;
  if (node.parentId != null && validIds.has(node.parentId)) return false;

  if (node.parentId != null && !validIds.has(node.parentId)) return true;

  if (node.parentId == null && (node.layer === 'custom' || node.layer === 'locked')) {
    if (!node.slug) return false;
    if (getCatalogParentSlug(node.slug)) return false;
    return true;
  }

  return false;
}

/**
 * Reasigna parent_id de nodos cuyo padre ya no existe (p. ej. slugs legacy eliminados).
 * No elimina nodos — solo repara la jerarquía.
 */
export async function repairOrphanedNodes(db: AppDatabase): Promise<number> {
  const rows = await db.getAllAsync('SELECT * FROM nodes ORDER BY id ASC');
  if (rows.length === 0) return 0;

  const nodes = rows.map((row) => mapNode(row as Record<string, unknown>));
  const validIds = new Set(nodes.map((node) => node.id));
  const slugToId = new Map<string, number>();
  for (const node of nodes) {
    if (node.slug) slugToId.set(node.slug, node.id);
  }

  const repairs: {
    nodeId: number;
    slug: string | null;
    oldParentId: number | null;
    newParentSlug: string;
    newParentId: number;
  }[] = [];

  for (const node of nodes) {
    if (!isOrphanedNode(node, validIds)) continue;

    const newParentSlug = resolveOrphanParentSlug(node);
    const newParentId = slugToId.get(newParentSlug);
    if (newParentId == null) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn(
          `[repairOrphanedNodes] Padre destino no encontrado para «${node.slug ?? node.name}» → ${newParentSlug}`
        );
      }
      continue;
    }

    if (node.parentId === newParentId) continue;

    await db.runAsync('UPDATE nodes SET parent_id = ? WHERE id = ?', newParentId, node.id);
    repairs.push({
      nodeId: node.id,
      slug: node.slug,
      oldParentId: node.parentId,
      newParentSlug,
      newParentId,
    });
  }

  if (repairs.length > 0) {
    console.log(`[repairOrphanedNodes] ${repairs.length} nodo(s) reparado(s):`, repairs);
  } else if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log('[repairOrphanedNodes] 0 nodos huérfanos');
  }

  return repairs.length;
}

export async function syncCustomNodePositions(db: AppDatabase): Promise<void> {
  const rows = await db.getAllAsync('SELECT * FROM nodes ORDER BY id ASC');
  if (rows.length === 0) return;

  const nodes = rows.map((row) => mapNode(row as Record<string, unknown>));
  const updates = recomputeCustomNodePositions(nodes);

  for (const [id, pos] of updates) {
    await db.runAsync('UPDATE nodes SET pos_x = ?, pos_y = ? WHERE id = ?', pos.posX, pos.posY, id);
  }
}

export async function runMigrations(db: AppDatabase): Promise<void> {
  const userCols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(users)');
  if (!userCols.some((c) => c.name === 'tree_view_mode')) {
    await db.execAsync(
      `ALTER TABLE users ADD COLUMN tree_view_mode TEXT NOT NULL DEFAULT 'advanced'`
    );
  }

  const nodeCols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(nodes)');
  if (!nodeCols.some((c) => c.name === 'parent_id')) {
    await db.execAsync(`ALTER TABLE nodes ADD COLUMN parent_id INTEGER`);
  }
  if (!nodeCols.some((c) => c.name === 'slug')) {
    await db.execAsync(`ALTER TABLE nodes ADD COLUMN slug TEXT`);
  }
  if (!nodeCols.some((c) => c.name === 'origin_pos_x')) {
    await db.execAsync(`ALTER TABLE nodes ADD COLUMN origin_pos_x REAL`);
  }
  if (!nodeCols.some((c) => c.name === 'origin_pos_y')) {
    await db.execAsync(`ALTER TABLE nodes ADD COLUMN origin_pos_y REAL`);
  }
  if (!nodeCols.some((c) => c.name === 'color_role')) {
    await db.execAsync(`ALTER TABLE nodes ADD COLUMN color_role TEXT`);
  }
  if (!nodeCols.some((c) => c.name === 'daily_verified_at')) {
    await db.execAsync(`ALTER TABLE nodes ADD COLUMN daily_verified_at TEXT`);
  }
  if (!nodeCols.some((c) => c.name === 'is_deleted')) {
    await db.execAsync(`ALTER TABLE nodes ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0`);
  }
  if (!nodeCols.some((c) => c.name === 'progress_updated_at')) {
    await db.execAsync(`ALTER TABLE nodes ADD COLUMN progress_updated_at TEXT`);
  }
  if (!nodeCols.some((c) => c.name === 'decay_categoria')) {
    await db.execAsync(`ALTER TABLE nodes ADD COLUMN decay_categoria TEXT`);
  }
  if (!nodeCols.some((c) => c.name === 'session_quality')) {
    await db.execAsync(`ALTER TABLE nodes ADD COLUMN session_quality TEXT`);
  }
  if (!nodeCols.some((c) => c.name === 'session_quality_history')) {
    await db.execAsync(`ALTER TABLE nodes ADD COLUMN session_quality_history TEXT`);
  }

  await db.runAsync(
    `UPDATE nodes SET color_role = 'critical'
     WHERE color_role IS NULL AND layer = 'root'`
  );

  await db.runAsync(
    `UPDATE nodes SET color_role = 'standard'
     WHERE color_role IS NULL AND layer = 'locked'`
  );

  await db.runAsync(
    `UPDATE nodes SET origin_pos_x = pos_x, origin_pos_y = pos_y
     WHERE origin_pos_x IS NULL AND layer IN ('custom', 'dormant')`
  );

  const onboardingCols = [
    'practice_frequency',
    'focus_preference',
    'retention_concern',
    'goal_type',
    'practice_reminder_enabled',
    'practice_reminder_hour',
  ] as const;

  for (const col of onboardingCols) {
    if (!userCols.some((c) => c.name === col)) {
      if (col === 'practice_reminder_enabled') {
        await db.execAsync(
          `ALTER TABLE users ADD COLUMN practice_reminder_enabled INTEGER NOT NULL DEFAULT 0`
        );
      } else if (col === 'practice_reminder_hour') {
        await db.execAsync(
          `ALTER TABLE users ADD COLUMN practice_reminder_hour INTEGER NOT NULL DEFAULT 9`
        );
      } else if (col === 'retention_concern') {
        await db.execAsync(`ALTER TABLE users ADD COLUMN retention_concern INTEGER`);
      } else {
        await db.execAsync(`ALTER TABLE users ADD COLUMN ${col} TEXT`);
      }
    }
  }
}

export async function seedInitialTree(db: AppDatabase): Promise<void> {
  await db.runAsync(
    `INSERT INTO users (profile, xp_gain_modifier, decay_speed_modifier, retention_shield, onboarding_complete, selected_skin)
     VALUES ('adult', 1.0, 1.0, 0, 0, 'rpg')`
  );
  await seedRootNodes(db);
  await syncWildcardNodes(db);
  await syncCatalogNodes(db);
}

/** Borra todo el almacenamiento local y vuelve a sembrar los 6 nodos madre + catálogo. */
export async function clearDatabaseAndReseed(db: AppDatabase): Promise<void> {
  await db.execAsync('DELETE FROM history_logs');
  await db.execAsync('DELETE FROM nen_history');
  await db.execAsync('DELETE FROM nodes');
  await db.execAsync('DELETE FROM users');
  await seedInitialTree(db);
}

export async function bootstrapDb(db: AppDatabase): Promise<void> {
  await runMigrations(db);

  const userCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM users'
  );

  if (userCount?.count === 0) {
    await seedInitialTree(db);
    await backfillNodeDecayCategories(db);
  } else {
    await syncRootNodes(db);
    await syncWildcardNodes(db);
    await syncCatalogNodes(db);
    await syncCustomNodeParentIds(db);
    await repairOrphanedNodes(db);

    const rowsBefore = await db.getAllAsync('SELECT * FROM nodes ORDER BY id ASC');
    const nodesBefore = rowsBefore.map((row) => mapNode(row as Record<string, unknown>));
    logSectorAuditBeforeMigration(nodesBefore);
    await migrateAllNodePositions(db);
    await backfillNodeDecayCategories(db);
  }
}
