import { clearShadowLayoutCache } from '@/src/utils/shadowRadialRepulsion';

import { getDatabase } from './localSchema.native';
import { clearDatabaseAndReseed } from './schema.shared';

export { getPersistenceBackend, type PersistenceBackend } from './persistence.shared';

/** Limpieza total SQLite + re-seed (iOS / Android). */
export async function resetLocalPersistence(): Promise<void> {
  clearShadowLayoutCache();
  const db = await getDatabase();
  await clearDatabaseAndReseed(db);
}
