import { buildSkillCatalogSeeds } from '@/src/data/skillCatalogSeeds';
import { isRootLayer } from '@/src/utils/nodeColors';
import {
  auditNodesOutsideSector,
  logSectorMigrationVerification,
} from '@/src/utils/nodeSectorLayout';
import { SkillNode } from '@/src/types';

import { mapNode } from './mappers';
import { AppDatabase } from './db.types';

/** Paso 1 — auditoría previa (solo lectura). */
export function auditCurrentNodeSectors(nodes: SkillNode[]) {
  return auditNodesOutsideSector(nodes);
}

/**
 * Paso 3 — recalcula pos_x/pos_y de todos los nodos no raíz.
 * Solo modifica coordenadas; XP, nivel, checks e historial quedan intactos.
 */
export async function migrateAllNodePositions(db: AppDatabase): Promise<number> {
  const rows = await db.getAllAsync('SELECT * FROM nodes ORDER BY id ASC');
  const nodes = rows.map((row) => mapNode(row as Record<string, unknown>));
  const catalogSeeds = buildSkillCatalogSeeds();
  const seedBySlug = new Map(catalogSeeds.map((seed) => [seed.slug, seed]));

  const updates: { id: number; posX: number; posY: number }[] = [];

  for (const node of nodes) {
    if (isRootLayer(node) || node.layer === 'dormant') continue;

    if (node.layer === 'locked' && node.slug && seedBySlug.has(node.slug)) {
      const seed = seedBySlug.get(node.slug)!;
      if (node.posX !== seed.posX || node.posY !== seed.posY) {
        updates.push({ id: node.id, posX: seed.posX, posY: seed.posY });
      }
    }
    // custom / wildcard / guide: conservar pos_x/pos_y elegidos por el usuario
  }

  for (const update of updates) {
    await db.runAsync('UPDATE nodes SET pos_x = ?, pos_y = ? WHERE id = ?', update.posX, update.posY, update.id);
  }

  if (updates.length > 0 && typeof __DEV__ !== 'undefined' && __DEV__) {
    const refreshed = (await db.getAllAsync('SELECT * FROM nodes ORDER BY id ASC')).map((row) =>
      mapNode(row as Record<string, unknown>)
    );
    logSectorMigrationVerification(refreshed);
  }

  return updates.length;
}

export function logSectorAuditBeforeMigration(nodes: SkillNode[]): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;

  const rows = auditCurrentNodeSectors(nodes);
  console.log(`[SectorLayout] Auditoría previa — nodos fuera de sector: ${rows.length}`);
  rows.slice(0, 20).forEach((row) => {
    console.log(
      `  · ${row.name} | macro=${row.macroArea} | vertiente=${row.vertienteId} | ahora en ${row.physicalSectorLabel} (Δ${row.deltaDeg}°)`
    );
  });
}
