import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { getDatabase } from '@/src/database/localSchema';
import { asRow, mapNode } from '@/src/database/mappers';
import { getNodeStreakStatsForNode } from '@/src/database/queryEngine.local';

export interface ProgressExportPayload {
  exportedAt: string;
  version: 1;
  nodes: Array<{
    slug: string | null;
    localId: number;
    name: string;
    level: number;
    xp: number;
    dailyVerifiedAt: string | null;
    lastPracticeAt: string | null;
    isDeleted: boolean;
    streakCurrent: number;
    streakMax: number;
  }>;
  nenHistory: Array<{
    date: string;
    intensification: number;
    transformation: number;
    specialization: number;
    emission: number;
    manipulation: number;
    materialization: number;
  }>;
}

export async function buildProgressExportPayload(): Promise<ProgressExportPayload> {
  const db = await getDatabase();
  const nodeRows = await db.getAllAsync(
    `SELECT * FROM nodes WHERE id > 0 AND layer != 'dormant' ORDER BY id ASC`
  );
  const nenRows = await db.getAllAsync('SELECT * FROM nen_history ORDER BY recorded_date ASC');

  const nodes = [];
  for (const row of nodeRows) {
    const node = mapNode(asRow(row));
    if (node.layer === 'locked' && node.xp <= 0 && node.level <= 1 && !node.dailyVerifiedAt) {
      continue;
    }

    let streakCurrent = 0;
    let streakMax = 0;
    try {
      const stats = await getNodeStreakStatsForNode(node);
      streakCurrent = stats.currentStreak;
      streakMax = stats.maxStreak;
    } catch {
      /* opcional */
    }

    nodes.push({
      slug: node.slug,
      localId: node.id,
      name: node.name,
      level: node.level,
      xp: node.xp,
      dailyVerifiedAt: node.dailyVerifiedAt,
      lastPracticeAt: node.lastPracticeAt,
      isDeleted: node.isDeleted,
      streakCurrent,
      streakMax,
    });
  }

  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    nodes,
    nenHistory: nenRows.map((row) => {
      const r = asRow(row);
      return {
        date: String(r.recorded_date),
        intensification: Number(r.intensification ?? 0),
        transformation: Number(r.transformation ?? 0),
        specialization: Number(r.specialization ?? 0),
        emission: Number(r.emission ?? 0),
        manipulation: Number(r.manipulation ?? 0),
        materialization: Number(r.materialization ?? 0),
      };
    }),
  };
}

export async function shareProgressExport(): Promise<{ ok: boolean; message: string }> {
  try {
    const payload = await buildProgressExportPayload();
    const json = JSON.stringify(payload, null, 2);
    const filename = `path-of-self-progress-${new Date().toISOString().slice(0, 10)}.json`;

    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(url);
      }
      return { ok: true, message: 'Descarga iniciada.' };
    }

    const uri = `${FileSystem.cacheDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(uri, json);

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      return { ok: false, message: 'Compartir no disponible en este dispositivo.' };
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      dialogTitle: 'Exportar progreso Path of Self',
      UTI: 'public.json',
    });

    return { ok: true, message: 'Progreso exportado.' };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'No se pudo exportar.',
    };
  }
}
