import { isSupabaseEnabled } from '@/src/config/env';
import { getDatabase } from '@/src/database/localSchema';
import { asRow, mapNode } from '@/src/database/mappers';
import { getNodeStreakStatsForNode } from '@/src/database/queryEngine.local';
import { ensureSupabaseSession, getSupabase } from '@/src/lib/supabase';
import { SkillNode } from '@/src/types';

export interface SyncResult {
  ok: boolean;
  message: string;
  pulled?: number;
  pushed?: number;
}

export interface SupabaseSchemaStatus {
  ok: boolean;
  nodeProgressTable: boolean;
  nenHistoryCloudTable: boolean;
  message: string;
  details?: string;
}

const MIGRATION_HINT =
  'Aplica supabase/migrations/003_progress_sync.sql en el SQL Editor de Supabase.';

function isMissingTableError(error: { code?: string; message?: string }): boolean {
  const message = error.message ?? '';
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    message.includes('Could not find the table') ||
    message.includes('does not exist')
  );
}

function formatSyncError(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { message?: string; code?: string; details?: string; hint?: string };
    const parts = [e.message, e.details, e.hint].filter(Boolean);
    if (parts.length > 0) return parts.join(' — ');
  }
  if (err instanceof Error) return err.message;
  return 'Error de sincronización';
}

/** Comprueba que las tablas de backup existen en Supabase (no requiere filas). */
export async function verifySupabaseBackupSchema(): Promise<SupabaseSchemaStatus> {
  if (!isSupabaseEnabled()) {
    return {
      ok: false,
      nodeProgressTable: false,
      nenHistoryCloudTable: false,
      message: 'Supabase no está configurado.',
      details: 'Añade EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  const supabase = getSupabase();

  const { error: nodeError } = await supabase
    .from('node_progress')
    .select('node_id', { head: true, count: 'exact' });

  const { error: nenError } = await supabase
    .from('nen_history_cloud')
    .select('fecha', { head: true, count: 'exact' });

  const nodeProgressTable = !nodeError || !isMissingTableError(nodeError);
  const nenHistoryCloudTable = !nenError || !isMissingTableError(nenError);

  if (!nodeProgressTable || !nenHistoryCloudTable) {
    const missing = [
      !nodeProgressTable ? 'node_progress' : null,
      !nenHistoryCloudTable ? 'nen_history_cloud' : null,
    ]
      .filter(Boolean)
      .join(', ');

    const details = [
      `Tablas ausentes: ${missing}.`,
      nodeError && !nodeProgressTable ? `node_progress: ${nodeError.message}` : null,
      nenError && !nenHistoryCloudTable ? `nen_history_cloud: ${nenError.message}` : null,
      MIGRATION_HINT,
    ]
      .filter(Boolean)
      .join(' ');

    console.error('[Sync] verifySupabaseBackupSchema failed:', details);

    return {
      ok: false,
      nodeProgressTable,
      nenHistoryCloudTable,
      message: `Tablas de backup no encontradas (${missing}).`,
      details,
    };
  }

  return {
    ok: true,
    nodeProgressTable: true,
    nenHistoryCloudTable: true,
    message: 'Tablas node_progress y nen_history_cloud disponibles.',
  };
}

interface CloudNodeProgress {
  node_id: string;
  nivel: number;
  xp: number;
  last_check_date: string | null;
  streak_current: number;
  streak_max: number;
  is_deleted: boolean;
  updated_at: string;
}

interface CloudNenRow {
  fecha: string;
  intensificacion: number;
  manipulacion: number;
  emision: number;
  materializacion: number;
  transformacion: number;
  especializacion: number;
  updated_at: string;
}

function nodeProgressKey(node: SkillNode): string | null {
  if (node.slug && node.slug.length > 0) return node.slug;
  if (node.id > 0) return `local:${node.id}`;
  return null;
}

function hasUserProgress(node: SkillNode): boolean {
  if (node.id <= 0 || node.layer === 'dormant') return false;
  return (
    node.layer === 'custom' ||
    node.xp > 0 ||
    node.level > 1 ||
    Boolean(node.dailyVerifiedAt) ||
    node.isDeleted
  );
}

export async function touchNodeProgressUpdated(nodeId: number): Promise<void> {
  if (nodeId <= 0) return;
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE nodes SET progress_updated_at = ? WHERE id = ?`,
    new Date().toISOString(),
    nodeId
  );
}

async function loadLocalProgressRows(): Promise<
  (CloudNodeProgress & { localId: number; slug: string | null })[]
> {
  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT * FROM nodes WHERE id > 0');
  const nodes = rows.map((row) => mapNode(asRow(row)));
  const result: (CloudNodeProgress & { localId: number; slug: string | null })[] = [];

  for (const node of nodes) {
    if (!hasUserProgress(node)) continue;
    const key = nodeProgressKey(node);
    if (!key) continue;

    const row = asRow(rows.find((r) => Number(asRow(r).id) === node.id)!);
    const updatedAt =
      (row.progress_updated_at as string) ??
      node.dailyVerifiedAt ??
      node.lastPracticeAt ??
      node.createdAt ??
      new Date().toISOString();

    let streakCurrent = 0;
    let streakMax = 0;
    try {
      const stats = await getNodeStreakStatsForNode(node);
      streakCurrent = stats.currentStreak;
      streakMax = stats.maxStreak;
    } catch {
      /* streak opcional */
    }

    result.push({
      localId: node.id,
      slug: node.slug,
      node_id: key,
      nivel: node.level,
      xp: Math.floor(node.xp),
      last_check_date: node.dailyVerifiedAt,
      streak_current: streakCurrent,
      streak_max: streakMax,
      is_deleted: node.isDeleted,
      updated_at: updatedAt,
    });
  }

  return result;
}

/** Borra progreso en SQLite local (evita re-subir datos viejos tras reinicio en otro dispositivo). */
async function clearLocalSyncProgress(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE nodes SET
      level = 1,
      xp = 0,
      daily_verified_at = NULL,
      is_deleted = 0,
      progress_updated_at = NULL,
      layer = CASE WHEN layer = 'custom' THEN 'locked' ELSE layer END
     WHERE id > 0`
  );
  await db.runAsync('DELETE FROM nen_history');
}

/**
 * Si la nube no tiene node_progress ni checks en nodes pero el SQLite local sí,
 * otro dispositivo hizo reinicio total — descartar local antes de push.
 */
async function discardStaleLocalIfCloudWasReset(userId: string): Promise<boolean> {
  const supabase = getSupabase();

  const { count: remoteProgressCount, error: progressError } = await supabase
    .from('node_progress')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (progressError && !isMissingTableError(progressError)) throw progressError;
  if ((remoteProgressCount ?? 0) > 0) return false;

  const localRows = await loadLocalProgressRows();
  if (localRows.length === 0) return false;

  const { count: verifiedInCloud, error: nodesError } = await supabase
    .from('nodes')
    .select('*', { count: 'exact', head: true })
    .eq('auth_id', userId)
    .not('daily_verified_at', 'is', null);

  if (nodesError) throw nodesError;
  if ((verifiedInCloud ?? 0) > 0) return false;

  await clearLocalSyncProgress();
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log('[Sync] Progreso local descartado — la nube fue reiniciada en otro dispositivo');
  }
  return true;
}

async function applyRemoteProgressToLocal(remote: CloudNodeProgress): Promise<boolean> {
  const db = await getDatabase();
  let localRow = await db.getFirstAsync(
    'SELECT * FROM nodes WHERE slug = ? LIMIT 1',
    remote.node_id
  );

  if (!localRow && remote.node_id.startsWith('local:')) {
    const localId = Number(remote.node_id.replace('local:', ''));
    if (Number.isFinite(localId)) {
      localRow = await db.getFirstAsync('SELECT * FROM nodes WHERE id = ?', localId);
    }
  }

  if (!localRow) return false;

  const local = mapNode(asRow(localRow));
  const localUpdated =
    (asRow(localRow).progress_updated_at as string) ??
    local.dailyVerifiedAt ??
    local.lastPracticeAt ??
    local.createdAt ??
    '';

  if (localUpdated && new Date(localUpdated).getTime() >= new Date(remote.updated_at).getTime()) {
    return false;
  }

  await db.runAsync(
    `UPDATE nodes SET
      level = ?,
      xp = ?,
      daily_verified_at = ?,
      is_deleted = ?,
      progress_updated_at = ?,
      layer = CASE WHEN layer = 'locked' AND ? IS NOT NULL THEN 'custom' ELSE layer END
     WHERE id = ?`,
    remote.nivel,
    remote.xp,
    remote.last_check_date,
    remote.is_deleted ? 1 : 0,
    remote.updated_at,
    remote.last_check_date,
    local.id
  );

  return true;
}

async function mergeNenHistory(remoteRows: CloudNenRow[]): Promise<number> {
  const db = await getDatabase();
  let merged = 0;

  for (const remote of remoteRows) {
    const localRow = await db.getFirstAsync(
      'SELECT * FROM nen_history WHERE recorded_date = ?',
      remote.fecha
    );

    const remoteTs = new Date(remote.updated_at).getTime();
    const localTs = localRow
      ? new Date(String(asRow(localRow).created_at ?? 0)).getTime()
      : 0;

    if (localRow && localTs >= remoteTs) continue;

    await db.runAsync(
      `INSERT INTO nen_history (
        recorded_date,
        intensification,
        transformation,
        specialization,
        emission,
        manipulation,
        materialization,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(recorded_date) DO UPDATE SET
        intensification = excluded.intensification,
        transformation = excluded.transformation,
        specialization = excluded.specialization,
        emission = excluded.emission,
        manipulation = excluded.manipulation,
        materialization = excluded.materialization,
        created_at = excluded.created_at`,
      remote.fecha,
      remote.intensificacion,
      remote.transformacion,
      remote.especializacion,
      remote.emision,
      remote.manipulacion,
      remote.materializacion,
      remote.updated_at
    );
    merged += 1;
  }

  return merged;
}

async function pushLocalNenHistory(userId: string): Promise<void> {
  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT * FROM nen_history ORDER BY recorded_date ASC');
  if (rows.length === 0) return;

  const supabase = getSupabase();
  const payload = rows.map((row) => {
    const r = asRow(row);
    return {
      user_id: userId,
      fecha: String(r.recorded_date),
      intensificacion: Number(r.intensification ?? 0),
      manipulacion: Number(r.manipulation ?? 0),
      emision: Number(r.emission ?? 0),
      materializacion: Number(r.materialization ?? 0),
      transformacion: Number(r.transformation ?? 0),
      especializacion: Number(r.specialization ?? 0),
      updated_at: String(r.created_at ?? new Date().toISOString()),
    };
  });

  const { error } = await supabase.from('nen_history_cloud').upsert(payload, {
    onConflict: 'user_id,fecha',
  });
  if (error) throw error;
}

/** Aplica progreso remoto al nodo equivalente en Supabase (misma cuenta = misma nube). */
async function applyRemoteProgressToSupabase(
  remote: CloudNodeProgress,
  authId: string
): Promise<boolean> {
  if (remote.node_id.startsWith('local:')) return false;

  const supabase = getSupabase();
  const { data: row, error } = await supabase
    .from('nodes')
    .select('*')
    .eq('auth_id', authId)
    .eq('slug', remote.node_id)
    .maybeSingle();

  if (error || !row) return false;

  const nodeUpdated =
    (row.daily_verified_at as string | null) ??
    (row.last_practice_at as string | null) ??
    (row.created_at as string | null) ??
    '';

  if (
    nodeUpdated &&
    new Date(nodeUpdated).getTime() >= new Date(remote.updated_at).getTime()
  ) {
    return false;
  }

  const nextLayer =
    remote.last_check_date && row.layer === 'locked' ? 'custom' : row.layer;

  const { error: updateError } = await supabase
    .from('nodes')
    .update({
      level: remote.nivel,
      xp: remote.xp,
      daily_verified_at: remote.last_check_date,
      is_deleted: remote.is_deleted,
      layer: nextLayer,
    })
    .eq('id', row.id)
    .eq('auth_id', authId);

  return !updateError;
}

export async function pullProgressFromCloud(): Promise<number> {
  if (!isSupabaseEnabled()) return 0;

  const userId = await ensureSupabaseSession();
  if (!userId) return 0;
  const supabase = getSupabase();

  const { data: remoteNodes, error: nodeError } = await supabase
    .from('node_progress')
    .select('*')
    .eq('user_id', userId);

  if (nodeError) {
    console.error('[Sync] pullProgressFromCloud node_progress:', nodeError);
    throw nodeError;
  }

  let applied = 0;
  for (const row of remoteNodes ?? []) {
    const progress = row as CloudNodeProgress;
    const appliedCloud = await applyRemoteProgressToSupabase(progress, userId);
    const appliedLocal = await applyRemoteProgressToLocal(progress);
    if (appliedCloud || appliedLocal) applied += 1;
  }

  const { data: remoteNen, error: nenError } = await supabase
    .from('nen_history_cloud')
    .select('*')
    .eq('user_id', userId);

  if (nenError) {
    console.error('[Sync] pullProgressFromCloud nen_history_cloud:', nenError);
    throw nenError;
  }
  if (remoteNen?.length) {
    applied += await mergeNenHistory(remoteNen as CloudNenRow[]);
  }

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log(`[Sync] pullProgressFromCloud: ${applied} registro(s) aplicado(s)`);
  }

  return applied;
}

export async function pushProgressToCloud(): Promise<number> {
  if (!isSupabaseEnabled()) return 0;

  const userId = await ensureSupabaseSession();
  if (!userId) return 0;
  const supabase = getSupabase();
  const localRows = await loadLocalProgressRows();

  if (localRows.length === 0) {
    await pushLocalNenHistory(userId);
    return 0;
  }

  const { data: remoteRows, error: fetchError } = await supabase
    .from('node_progress')
    .select('node_id, updated_at')
    .eq('user_id', userId);

  if (fetchError) {
    console.error('[Sync] pushProgressToCloud fetch node_progress:', fetchError);
    throw fetchError;
  }

  const remoteMap = new Map(
    (remoteRows ?? []).map((r) => [String(r.node_id), String(r.updated_at)])
  );

  const toUpsert = localRows
    .filter((local) => {
      const remoteUpdated = remoteMap.get(local.node_id);
      if (!remoteUpdated) return true;
      return new Date(local.updated_at).getTime() >= new Date(remoteUpdated).getTime();
    })
    .map((local) => ({
      user_id: userId,
      node_id: local.node_id,
      nivel: local.nivel,
      xp: local.xp,
      last_check_date: local.last_check_date,
      streak_current: local.streak_current,
      streak_max: local.streak_max,
      is_deleted: local.is_deleted,
      updated_at: local.updated_at,
    }));

  if (toUpsert.length > 0) {
    const { error } = await supabase.from('node_progress').upsert(toUpsert, {
      onConflict: 'user_id,node_id',
    });
    if (error) {
      console.error('[Sync] pushProgressToCloud upsert node_progress:', error, {
        rows: toUpsert.length,
        userId,
      });
      throw error;
    }
  }

  try {
    await pushLocalNenHistory(userId);
  } catch (err) {
    console.error('[Sync] pushProgressToCloud nen_history_cloud:', err);
    throw err;
  }

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log(`[Sync] pushProgressToCloud: ${toUpsert.length} nodo(s) subido(s), userId=${userId}`);
  }

  return toUpsert.length;
}

/** Borra el progreso sincronizado en la nube (reinicio total con sesión activa). */
export async function clearCloudProgressForCurrentUser(): Promise<void> {
  if (!isSupabaseEnabled()) return;

  const userId = await ensureSupabaseSession();
  if (!userId) return;

  const supabase = getSupabase();
  const { error: nodeError } = await supabase.from('node_progress').delete().eq('user_id', userId);
  if (nodeError) {
    console.error('[Sync] clearCloudProgress node_progress:', nodeError);
    throw nodeError;
  }

  const { error: nenError } = await supabase
    .from('nen_history_cloud')
    .delete()
    .eq('user_id', userId);
  if (nenError && !isMissingTableError(nenError)) {
    console.error('[Sync] clearCloudProgress nen_history_cloud:', nenError);
    throw nenError;
  }
}

/**
 * Reinicio total en modo nube: borra nodos, historial y progreso del usuario en Supabase.
 * Tras volver a iniciar sesión, prepareSupabaseUser re-siembra el árbol inicial.
 */
export async function clearCloudAccountForFullReset(): Promise<void> {
  if (!isSupabaseEnabled()) return;

  const authId = await ensureSupabaseSession();
  if (!authId) {
    throw new Error('Inicia sesión con Google antes del reinicio total para borrar la nube.');
  }

  const supabase = getSupabase();

  // history_logs no tiene política DELETE — borrar nodes cascada el historial (FK).
  const deleteSteps: { table: string; column: string }[] = [
    { table: 'node_progress', column: 'user_id' },
    { table: 'nen_history_cloud', column: 'user_id' },
    { table: 'nodes', column: 'auth_id' },
  ];

  for (const { table, column } of deleteSteps) {
    const { error } = await supabase.from(table).delete().eq(column, authId);
    if (error && !isMissingTableError(error)) {
      console.error(`[Sync] clearCloudAccountForFullReset ${table}:`, error);
      throw new Error(
        `No se pudo borrar ${table} en la nube: ${error.message ?? 'error desconocido'}`
      );
    }
  }

  const { count, error: countError } = await supabase
    .from('nodes')
    .select('*', { count: 'exact', head: true })
    .eq('auth_id', authId);

  if (countError && !isMissingTableError(countError)) {
    throw new Error(`No se pudo verificar el borrado en la nube: ${countError.message}`);
  }
  if ((count ?? 0) > 0) {
    throw new Error(
      'Quedaron nodos en la nube tras el reinicio. Revisa políticas RLS (DELETE) en Supabase.'
    );
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ onboarding_complete: false })
    .eq('auth_id', authId);

  if (profileError && !isMissingTableError(profileError)) {
    console.error('[Sync] clearCloudAccountForFullReset profiles:', profileError);
    throw profileError;
  }
}

/** Merge bidireccional al abrir: nube → local (más reciente gana), luego local → nube. */
export async function mergeProgressOnOpen(): Promise<SyncResult> {
  if (!isSupabaseEnabled()) {
    return { ok: true, message: 'Modo local — Supabase no configurado.' };
  }

  try {
    const schema = await verifySupabaseBackupSchema();
    if (!schema.ok) {
      return {
        ok: false,
        message: schema.details ?? schema.message,
      };
    }

    const authId = await ensureSupabaseSession();
    if (!authId) {
      return {
        ok: false,
        message: 'Inicia sesión con Google para sincronizar el progreso.',
      };
    }

    const pulled = await pullProgressFromCloud();
    const discardedStale = await discardStaleLocalIfCloudWasReset(authId);
    const pushed = discardedStale ? 0 : await pushProgressToCloud();
    return {
      ok: true,
      message: 'Progreso guardado en la nube ✓',
      pulled,
      pushed,
    };
  } catch (err) {
    const message = formatSyncError(err);
    console.error('[Sync] mergeProgressOnOpen failed:', err);
    return { ok: false, message };
  }
}

export async function syncProgressNow(): Promise<SyncResult> {
  return mergeProgressOnOpen();
}
