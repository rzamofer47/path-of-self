import * as SQLite from 'expo-sqlite';

import { AppDatabase } from './db.types';
import { bootstrapDb } from './schema.shared';

let dbInstance: SQLite.SQLiteDatabase | null = null;

async function createTables(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile TEXT NOT NULL DEFAULT 'adult',
      xp_gain_modifier REAL NOT NULL DEFAULT 1.0,
      decay_speed_modifier REAL NOT NULL DEFAULT 1.0,
      retention_shield INTEGER NOT NULL DEFAULT 0,
      onboarding_complete INTEGER NOT NULL DEFAULT 0,
      selected_skin TEXT NOT NULL DEFAULT 'rpg',
      tree_view_mode TEXT NOT NULL DEFAULT 'advanced',
      practice_frequency TEXT,
      focus_preference TEXT,
      retention_concern INTEGER,
      goal_type TEXT,
      practice_reminder_enabled INTEGER NOT NULL DEFAULT 0,
      practice_reminder_hour INTEGER NOT NULL DEFAULT 9,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      layer TEXT NOT NULL DEFAULT 'custom',
      macro_area TEXT NOT NULL,
      xp REAL NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 1,
      pos_x REAL NOT NULL DEFAULT 0,
      pos_y REAL NOT NULL DEFAULT 0,
      last_practice_at TEXT,
      weekly_xp_sessions INTEGER NOT NULL DEFAULT 0,
      week_start_at TEXT,
      daily_verified_at TEXT,
      guide_url TEXT,
      slug TEXT,
      parent_id INTEGER,
      origin_pos_x REAL,
      origin_pos_y REAL,
      color_role TEXT,
      decay_categoria TEXT,
      session_quality TEXT,
      session_quality_history TEXT,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (parent_id) REFERENCES nodes(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS history_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      node_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
    );

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

export async function getDatabase(): Promise<AppDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('rpg_skill_tree.db');
    await createTables(dbInstance);
    await bootstrapDb(dbInstance as AppDatabase);
  }
  return dbInstance as AppDatabase;
}
