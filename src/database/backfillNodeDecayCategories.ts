import { resolveDecayCategoria } from '@/src/utils/resolveNenDecayCategory';
import { mapNode, asRow } from './mappers';
import { AppDatabase } from './db.types';

/** Persiste decay_categoria inferida para todos los nodos del catálogo. */
export async function backfillNodeDecayCategories(db: AppDatabase): Promise<void> {
  const rows = await db.getAllAsync('SELECT * FROM nodes ORDER BY id ASC');
  const nodes = rows.map((row) => mapNode(asRow(row)));

  for (const node of nodes) {
    const resolved = resolveDecayCategoria(node, nodes);
    if (node.decayCategoria !== resolved) {
      await db.runAsync('UPDATE nodes SET decay_categoria = ? WHERE id = ?', resolved, node.id);
    }
  }
}
