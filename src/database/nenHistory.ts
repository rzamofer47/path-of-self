import {
  NEN_HISTORY_RETENTION_DAYS,
  NEN_SMOOTHING_WINDOW_DAYS,
  NEN_AXIS_IDS_ORDER,
  NenAxisId,
  NenProfile,
} from '@/src/config/nenConfig';
import { getDatabase } from '@/src/database/localSchema';
import { asRow } from '@/src/database/mappers';
import { averageNenProfiles, calculateNenHexagon } from '@/src/utils/nenEngine';
import {
  applyNenProfileDecay,
  buildNenAxisDecayInsights,
  NenAxisDecayInsight,
} from '@/src/utils/nenDecayEngine';
import { SkillNode } from '@/src/types';

function todayDateKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function profileFromRow(row: Record<string, unknown>): NenProfile {
  return {
    intensification: Number(row.intensification ?? 0),
    transformation: Number(row.transformation ?? 0),
    specialization: Number(row.specialization ?? 0),
    emission: Number(row.emission ?? 0),
    manipulation: Number(row.manipulation ?? 0),
    materialization: Number(row.materialization ?? 0),
  };
}

export async function ensureNenHistoryTable(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS nen_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recorded_date TEXT NOT NULL UNIQUE,
      intensification REAL NOT NULL DEFAULT 0,
      transformation REAL NOT NULL DEFAULT 0,
      specialization REAL NOT NULL DEFAULT 0,
      emission REAL NOT NULL DEFAULT 0,
      manipulation REAL NOT NULL DEFAULT 0,
      materialization REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function profileHasProgress(profile: NenProfile): boolean {
  return Object.values(profile).some((value) => value > 0);
}

function mergeNenProfilesMax(raw: NenProfile, smoothed: NenProfile): NenProfile {
  if (!profileHasProgress(raw)) {
    return raw;
  }
  const merged = { ...smoothed };
  (Object.keys(merged) as NenAxisId[]).forEach((axisId) => {
    merged[axisId] = Math.max(raw[axisId], smoothed[axisId]);
  });
  return merged;
}

export async function recordNenSnapshot(allNodes: SkillNode[]): Promise<NenProfile> {
  await ensureNenHistoryTable();
  const db = await getDatabase();
  const profile = calculateNenHexagon(allNodes);
  const dateKey = todayDateKey();

  if (profileHasProgress(profile)) {
    await db.runAsync(
      `DELETE FROM nen_history
       WHERE intensification = 0
         AND transformation = 0
         AND specialization = 0
         AND emission = 0
         AND manipulation = 0
         AND materialization = 0`
    );
  }

  await db.runAsync(
    `INSERT INTO nen_history (
      recorded_date,
      intensification,
      transformation,
      specialization,
      emission,
      manipulation,
      materialization
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(recorded_date) DO UPDATE SET
      intensification = excluded.intensification,
      transformation = excluded.transformation,
      specialization = excluded.specialization,
      emission = excluded.emission,
      manipulation = excluded.manipulation,
      materialization = excluded.materialization`,
    dateKey,
    profile.intensification,
    profile.transformation,
    profile.specialization,
    profile.emission,
    profile.manipulation,
    profile.materialization
  );

  await pruneNenHistory();
  return profile;
}

export async function pruneNenHistory(): Promise<void> {
  await ensureNenHistoryTable();
  const db = await getDatabase();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - NEN_HISTORY_RETENTION_DAYS);
  const cutoffKey = todayDateKey(cutoff);
  await db.runAsync('DELETE FROM nen_history WHERE recorded_date < ?', cutoffKey);
}

export async function computeSmoothedNenBase(allNodes: SkillNode[]): Promise<NenProfile> {
  const raw = await recordNenSnapshot(allNodes);
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM nen_history ORDER BY recorded_date DESC LIMIT ?`,
    NEN_SMOOTHING_WINDOW_DAYS
  );

  if (rows.length === 0) {
    return raw;
  }

  const profiles = rows
    .map((row) => profileFromRow(asRow(row)))
    .filter(profileHasProgress);

  if (profiles.length === 0) {
    return raw;
  }

  const smoothed = averageNenProfiles(profiles.reverse());
  return mergeNenProfilesMax(raw, smoothed);
}

export interface NenRadarDisplayContext {
  baseProfile: NenProfile;
  displayProfile: NenProfile;
  insights: NenAxisDecayInsight[];
}

export async function getNenRadarDisplayContext(
  allNodes: SkillNode[],
  now: Date = new Date()
): Promise<NenRadarDisplayContext> {
  const baseProfile = await computeSmoothedNenBase(allNodes);
  const displayProfile = applyNenProfileDecay(baseProfile, allNodes, now);
  const insights = buildNenAxisDecayInsights(baseProfile, displayProfile, allNodes, now);
  return { baseProfile, displayProfile, insights };
}

export async function getSmoothedNenProfile(allNodes: SkillNode[]): Promise<NenProfile> {
  const baseProfile = await computeSmoothedNenBase(allNodes);
  return applyNenProfileDecay(baseProfile, allNodes);
}

const ALL_AXIS_IDS = NEN_AXIS_IDS_ORDER;

export async function getHistoricalAxisMaxes(): Promise<NenProfile> {
  await ensureNenHistoryTable();
  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT * FROM nen_history ORDER BY recorded_date ASC');
  const maxes: NenProfile = { ...profileFromRow({}) };

  for (const row of rows) {
    const profile = profileFromRow(asRow(row));
    for (const axisId of ALL_AXIS_IDS) {
      maxes[axisId] = Math.max(maxes[axisId], profile[axisId]);
    }
  }

  return maxes;
}

export interface WeeklyNenGrowthHighlight {
  axisId: NenAxisId;
  growthPct: number;
}

/** Eje con mayor crecimiento: últimos 7 días vs. los 7 anteriores. */
export async function getWeeklyNenGrowthHighlight(): Promise<WeeklyNenGrowthHighlight | null> {
  await ensureNenHistoryTable();
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    'SELECT * FROM nen_history ORDER BY recorded_date DESC LIMIT 14'
  );
  if (rows.length < 2) return null;

  const profiles = rows.map((row) => profileFromRow(asRow(row))).reverse();
  const recent = profiles.slice(Math.max(0, profiles.length - 7));
  const previous = profiles.slice(Math.max(0, profiles.length - 14), Math.max(0, profiles.length - 7));

  if (recent.length === 0) return null;

  const avg = (list: NenProfile[], axisId: NenAxisId) => {
    if (list.length === 0) return 0;
    return list.reduce((sum, p) => sum + p[axisId], 0) / list.length;
  };

  let best: WeeklyNenGrowthHighlight | null = null;

  for (const axisId of ALL_AXIS_IDS) {
    const recentAvg = avg(recent, axisId);
    const prevAvg = previous.length > 0 ? avg(previous, axisId) : 0;
    const base = Math.max(prevAvg, 0.01);
    const growthPct = ((recentAvg - prevAvg) / base) * 100;
    if (!best || growthPct > best.growthPct) {
      best = { axisId, growthPct };
    }
  }

  return best && best.growthPct > 0.5 ? best : null;
}
