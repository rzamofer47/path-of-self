import { Platform } from 'react-native';

import { getStorageMode } from '@/src/config/env';

/** Backend activo: SQLite (nativo), localStorage (web) o Supabase (cloud). */
export type PersistenceBackend = 'sqlite' | 'localStorage' | 'supabase';

export function getPersistenceBackend(): PersistenceBackend {
  if (getStorageMode() === 'cloud') return 'supabase';
  return Platform.OS === 'web' ? 'localStorage' : 'sqlite';
}
