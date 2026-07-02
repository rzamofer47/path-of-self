import { clearShadowLayoutCache } from '@/src/utils/shadowRadialRepulsion';

import { getDatabase, resetWebDatabase } from './localSchema.web';

export { getPersistenceBackend, type PersistenceBackend } from './persistence.shared';

/** Limpieza total localStorage + re-seed (solo web). */
export async function resetLocalPersistence(): Promise<void> {
  clearShadowLayoutCache();
  resetWebDatabase();
  await getDatabase();
}
