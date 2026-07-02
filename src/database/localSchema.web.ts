import { AppDatabase, RunResult } from './db.types';
import { NEN_MOTHER_ROOTS } from '@/src/config/nenMotherRoots';
import { resolveNenAxisFromCanvasPosition } from '@/src/utils/mapGeometry';
import { ORB_RADIUS } from '@/src/utils/treeLayout';
import { ROOT_SEEDS } from './rootSeeds';
import { bootstrapDb } from './schema.shared';

const STORAGE_KEY = 'rpg_skill_tree_web_v1';
const STORAGE_BACKUP_KEY = 'rpg_skill_tree_web_v1_backup';

type Row = Record<string, unknown>;

interface WebStore {
  users: Row[];
  nodes: Row[];
  history_logs: Row[];
  nen_history: Row[];
  nextUserId: number;
  nextNodeId: number;
  nextHistoryId: number;
  nextNenHistoryId: number;
}

function nowIso(): string {
  return new Date().toISOString();
}

function loadStore(): WebStore {
  if (typeof localStorage === 'undefined') {
    return emptyStore();
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyStore();
  try {
    return JSON.parse(raw) as WebStore;
  } catch {
    const backup = localStorage.getItem(STORAGE_BACKUP_KEY);
    if (backup) {
      try {
        const restored = JSON.parse(backup) as WebStore;
        localStorage.setItem(STORAGE_KEY, backup);
        return restored;
      } catch {
        /* backup también corrupto */
      }
    }
    return emptyStore();
  }
}

function migrateStoreSchema(store: WebStore): boolean {
  let changed = false;

  for (const user of store.users) {
    if (user.tree_view_mode === undefined) {
      user.tree_view_mode = 'advanced';
      changed = true;
    }
    if (user.practice_frequency === undefined) {
      user.practice_frequency = null;
      changed = true;
    }
    if (user.focus_preference === undefined) {
      user.focus_preference = null;
      changed = true;
    }
    if (user.retention_concern === undefined) {
      user.retention_concern = null;
      changed = true;
    }
    if (user.goal_type === undefined) {
      user.goal_type = null;
      changed = true;
    }
    if (user.practice_reminder_enabled === undefined) {
      user.practice_reminder_enabled = 0;
      changed = true;
    }
    if (user.practice_reminder_hour === undefined) {
      user.practice_reminder_hour = 9;
      changed = true;
    }
  }

  for (const node of store.nodes) {
    if (node.parent_id === undefined) {
      node.parent_id = null;
      changed = true;
    }
    if (node.slug === undefined) {
      node.slug = null;
      changed = true;
    }
    if (node.daily_verified_at === undefined) {
      node.daily_verified_at = null;
      changed = true;
    }
    if (node.is_deleted === undefined) {
      node.is_deleted = 0;
      changed = true;
    }
    if (node.progress_updated_at === undefined) {
      node.progress_updated_at = null;
      changed = true;
    }
    if (node.decay_categoria === undefined) {
      node.decay_categoria = null;
      changed = true;
    }
    if (node.session_quality === undefined) {
      node.session_quality = null;
      changed = true;
    }
    if (node.session_quality_history === undefined) {
      node.session_quality_history = null;
      changed = true;
    }
    if (
      node.origin_pos_x === undefined &&
      (node.layer === 'custom' || node.layer === 'dormant')
    ) {
      node.origin_pos_x = node.pos_x;
      node.origin_pos_y = node.pos_y;
      changed = true;
    }
  }

  if (!store.nen_history) {
    store.nen_history = [];
    changed = true;
  }
  if (store.nextNenHistoryId === undefined) {
    store.nextNenHistoryId = 1;
    changed = true;
  }

  if (repairRootNodePositions(store)) {
    changed = true;
  }

  if (repairRootMetadataFromPosition(store)) {
    changed = true;
  }

  if (repairRootNodePositions(store)) {
    changed = true;
  }

  if (normalizeNodeSlugs(store)) {
    changed = true;
  }

  if (dedupeRootNodesBySlug(store)) {
    changed = true;
  }

  return changed;
}

function isRootSlug(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('root_');
}

/** Corrige slug/nombre cuando no coincide con el vértice del hexágono donde está el orbe. */
function repairRootMetadataFromPosition(store: WebStore): boolean {
  let changed = false;

  for (const node of store.nodes) {
    if (node.layer !== 'root' && node.layer !== 'guide') continue;

    const axisFromPosition = resolveNenAxisFromCanvasPosition(
      Number(node.pos_x) + ORB_RADIUS,
      Number(node.pos_y) + ORB_RADIUS
    );
    const slug = typeof node.slug === 'string' ? node.slug : '';
    const seedForSlug = slug ? ROOT_SEEDS.find((s) => s.slug === slug) : undefined;
    const axisFromSlug = seedForSlug
      ? resolveNenAxisFromCanvasPosition(
          seedForSlug.posX + ORB_RADIUS,
          seedForSlug.posY + ORB_RADIUS
        )
      : null;

    if (axisFromSlug != null && axisFromSlug === axisFromPosition) continue;

    const mother = NEN_MOTHER_ROOTS.find((root) => root.id === axisFromPosition);
    if (!mother) continue;

    if (node.slug !== mother.slug) {
      node.slug = mother.slug;
      changed = true;
    }
    if (node.name !== mother.name) {
      node.name = mother.name;
      changed = true;
    }
    if (node.type !== mother.type) {
      node.type = mother.type;
      changed = true;
    }
    if (node.macro_area !== mother.macroArea) {
      node.macro_area = mother.macroArea;
      changed = true;
    }
    if (node.layer !== 'root') {
      node.layer = 'root';
      changed = true;
    }
  }

  return changed;
}

/** Repara raíces Nen con slug/posición corruptos tras migraciones web fallidas. */
function repairRootNodePositions(store: WebStore): boolean {
  let changed = false;
  const matchedNodeIds = new Set<number>();

  for (const seed of ROOT_SEEDS) {
    let node = store.nodes.find(
      (candidate) =>
        (candidate.layer === 'root' || candidate.layer === 'guide') &&
        !matchedNodeIds.has(candidate.id as number) &&
        candidate.slug === seed.slug
    );

    if (!node) {
      node = store.nodes.find(
        (candidate) =>
          (candidate.layer === 'root' || candidate.layer === 'guide') &&
          !matchedNodeIds.has(candidate.id as number) &&
          isRootSlug(candidate.pos_x) &&
          candidate.pos_x === seed.slug
      );
    }

    if (!node) {
      node = store.nodes.find(
        (candidate) =>
          (candidate.layer === 'root' || candidate.layer === 'guide') &&
          !matchedNodeIds.has(candidate.id as number) &&
          candidate.name === seed.name
      );
    }

    if (!node) continue;
    matchedNodeIds.add(node.id as number);

    if (node.slug !== seed.slug) {
      node.slug = seed.slug;
      changed = true;
    }
    if (node.name !== seed.name) {
      node.name = seed.name;
      changed = true;
    }
    if (node.type !== seed.type) {
      node.type = seed.type;
      changed = true;
    }
    if (node.macro_area !== seed.macroArea) {
      node.macro_area = seed.macroArea;
      changed = true;
    }
    if (node.layer !== 'root') {
      node.layer = 'root';
      changed = true;
    }
    if (node.pos_x !== seed.posX || node.pos_y !== seed.posY) {
      node.pos_x = seed.posX;
      node.pos_y = seed.posY;
      changed = true;
    }
  }

  return changed;
}

/** Slugs no-texto (p. ej. números) rompen `.startsWith` en runtime. */
function normalizeNodeSlugs(store: WebStore): boolean {
  let changed = false;

  for (const node of store.nodes) {
    if (node.slug == null) continue;
    if (typeof node.slug === 'string') continue;
    node.slug = null;
    changed = true;
  }

  return changed;
}

/** Elimina raíces duplicadas con el mismo slug (conserva la de menor id). */
function dedupeRootNodesBySlug(store: WebStore): boolean {
  const keepIdBySlug = new Map<string, number>();
  const duplicateIds: number[] = [];

  for (const node of store.nodes) {
    if (node.layer !== 'root' && node.layer !== 'guide') continue;
    const slug = typeof node.slug === 'string' ? node.slug : null;
    if (!slug) continue;

    const id = node.id as number;
    const existing = keepIdBySlug.get(slug);
    if (existing == null) {
      keepIdBySlug.set(slug, id);
      continue;
    }

    if (id < existing) {
      duplicateIds.push(existing);
      keepIdBySlug.set(slug, id);
    } else {
      duplicateIds.push(id);
    }
  }

  if (duplicateIds.length === 0) return false;

  const dupSet = new Set(duplicateIds);
  const slugByDupId = new Map<number, string>();
  for (const node of store.nodes) {
    const id = node.id as number;
    if (dupSet.has(id) && node.slug) {
      slugByDupId.set(id, node.slug as string);
    }
  }

  for (const node of store.nodes) {
    const parentId = node.parent_id as number | null | undefined;
    if (parentId == null || !dupSet.has(parentId)) continue;
    const slug = slugByDupId.get(parentId);
    const keeper = slug ? keepIdBySlug.get(slug) : null;
    if (keeper != null) node.parent_id = keeper;
  }

  store.nodes = store.nodes.filter((node) => !dupSet.has(node.id as number));
  return true;
}

function emptyStore(): WebStore {
  return {
    users: [],
    nodes: [],
    history_logs: [],
    nen_history: [],
    nextUserId: 1,
    nextNodeId: 1,
    nextHistoryId: 1,
    nextNenHistoryId: 1,
  };
}

class WebDatabase implements AppDatabase {
  private store: WebStore;

  constructor() {
    this.store = loadStore();
    if (migrateStoreSchema(this.store)) {
      this.persist();
    }
  }

  private persist(): void {
    if (typeof localStorage !== 'undefined') {
      const payload = JSON.stringify(this.store);
      const current = localStorage.getItem(STORAGE_KEY);
      if (current) {
        localStorage.setItem(STORAGE_BACKUP_KEY, current);
      }
      localStorage.setItem(STORAGE_KEY, payload);
    }
  }

  async execAsync(sql: string): Promise<void> {
    if (sql.includes('CREATE TABLE')) return;

    if (sql.includes('tree_view_mode')) {
      for (const user of this.store.users) {
        if (user.tree_view_mode === undefined) user.tree_view_mode = 'advanced';
      }
      this.persist();
      return;
    }

    if (
      sql.includes('practice_frequency') ||
      sql.includes('focus_preference') ||
      sql.includes('retention_concern') ||
      sql.includes('goal_type') ||
      sql.includes('practice_reminder_enabled') ||
      sql.includes('practice_reminder_hour')
    ) {
      migrateStoreSchema(this.store);
      this.persist();
      return;
    }

    if (sql.includes('origin_pos_x') || sql.includes('origin_pos_y')) {
      for (const node of this.store.nodes) {
        if (
          node.origin_pos_x === undefined &&
          (node.layer === 'custom' || node.layer === 'dormant')
        ) {
          node.origin_pos_x = node.pos_x;
          node.origin_pos_y = node.pos_y;
        }
      }
      this.persist();
      return;
    }

    if (sql.includes('parent_id')) {
      for (const node of this.store.nodes) {
        if (node.parent_id === undefined) node.parent_id = null;
      }
      this.persist();
    }

    if (sql.includes('slug')) {
      for (const node of this.store.nodes) {
        if (node.slug === undefined) node.slug = null;
      }
      this.persist();
    }

    if (sql.includes('decay_categoria')) {
      for (const node of this.store.nodes) {
        if (node.decay_categoria === undefined) node.decay_categoria = null;
      }
      this.persist();
    }

    if (sql.includes("layer = 'root'") && sql.includes("layer = 'guide'")) {
      for (const node of this.store.nodes) {
        if (node.layer === 'guide') node.layer = 'root';
      }
      this.persist();
    }
  }

  async getFirstAsync<T = Row>(sql: string, ...params: unknown[]): Promise<T | null> {
    const rows = await this.getAllAsync<T>(sql, ...params);
    return rows[0] ?? null;
  }

  async getAllAsync<T = Row>(sql: string, ...params: unknown[]): Promise<T[]> {
    const normalized = sql.replace(/\s+/g, ' ').trim();

    if (normalized === 'PRAGMA table_info(users)') {
      const cols = [
        'id',
        'profile',
        'xp_gain_modifier',
        'decay_speed_modifier',
        'retention_shield',
        'onboarding_complete',
        'selected_skin',
        'created_at',
      ];
      if (this.store.users[0]?.tree_view_mode !== undefined) cols.push('tree_view_mode');
      return cols.map((name) => ({ name })) as T[];
    }

    if (normalized === 'PRAGMA table_info(nodes)') {
      const cols = [
        'id',
        'name',
        'type',
        'layer',
        'macro_area',
        'xp',
        'level',
        'pos_x',
        'pos_y',
        'last_practice_at',
        'weekly_xp_sessions',
        'week_start_at',
        'guide_url',
        'created_at',
      ];
      if (this.store.nodes.some((n) => n.parent_id !== undefined)) cols.push('parent_id');
      if (this.store.nodes.some((n) => n.slug !== undefined)) cols.push('slug');
      if (this.store.nodes.some((n) => n.decay_categoria !== undefined)) cols.push('decay_categoria');
      return cols.map((name) => ({ name })) as T[];
    }

    if (normalized === 'SELECT * FROM users LIMIT 1') {
      return (this.store.users[0] ? [this.store.users[0]] : []) as T[];
    }

    if (normalized === 'SELECT COUNT(*) as count FROM users') {
      return [{ count: this.store.users.length }] as T[];
    }

    if (normalized === 'SELECT * FROM nodes ORDER BY id ASC') {
      return [...this.store.nodes].sort((a, b) => (a.id as number) - (b.id as number)) as T[];
    }

    if (normalized === 'SELECT * FROM nodes WHERE id = ?') {
      const id = params[0] as number;
      const node = this.store.nodes.find((n) => n.id === id);
      return (node ? [node] : []) as T[];
    }

    if (
      normalized.includes("layer = 'root'") &&
      normalized.includes('macro_area = ?')
    ) {
      const area = params[0] as string;
      const node = this.store.nodes.find(
        (n) => (n.layer === 'root' || n.layer === 'guide') && n.macro_area === area
      );
      return (node ? [{ id: node.id }] : []) as T[];
    }

    if (
      normalized.includes('slug = ?') &&
      normalized.includes("layer IN ('root', 'guide')")
    ) {
      const slug = params[0] as string;
      const node = this.store.nodes.find(
        (n) => n.slug === slug && (n.layer === 'root' || n.layer === 'guide')
      );
      return (node ? [{ id: node.id }] : []) as T[];
    }

    if (normalized === 'SELECT id FROM nodes WHERE slug = ? LIMIT 1') {
      const slug = params[0] as string;
      const node = this.store.nodes.find((n) => n.slug === slug);
      return (node ? [{ id: node.id }] : []) as T[];
    }

    if (normalized.includes('FROM history_logs h') && normalized.includes('JOIN nodes n')) {
      const limit = (params[0] as number) ?? 20;
      const joined = this.store.history_logs
        .map((h) => {
          const n = this.store.nodes.find((node) => node.id === h.node_id);
          return { ...h, node_name: n?.name ?? '' } as Row;
        })
        .sort(
          (a, b) =>
            new Date(String(b.timestamp)).getTime() - new Date(String(a.timestamp)).getTime()
        )
        .slice(0, limit);
      return joined as T[];
    }

    if (normalized.includes('FROM nen_history')) {
      const limit = params.length > 0 ? (params[params.length - 1] as number) : undefined;
      const sorted = [...this.store.nen_history].sort((a, b) =>
        String(b.recorded_date).localeCompare(String(a.recorded_date))
      );
      return (limit != null ? sorted.slice(0, limit) : sorted) as T[];
    }

    return [];
  }

  async runAsync(sql: string, ...params: unknown[]): Promise<RunResult> {
    const normalized = sql.replace(/\s+/g, ' ').trim();

    if (normalized.includes('INSERT INTO users')) {
      const id = this.store.nextUserId++;
      this.store.users.push({
        id,
        profile: 'adult',
        xp_gain_modifier: 1.0,
        decay_speed_modifier: 1.0,
        retention_shield: 0,
        onboarding_complete: 0,
        selected_skin: 'rpg',
        tree_view_mode: 'advanced',
        practice_frequency: null,
        focus_preference: null,
        retention_concern: null,
        goal_type: null,
        practice_reminder_enabled: 0,
        practice_reminder_hour: 9,
        created_at: nowIso(),
      });
      this.persist();
      return { lastInsertRowId: id, changes: 1 };
    }

    if (
      normalized.includes('UPDATE users SET onboarding_complete = 1') &&
      !normalized.includes('profile =')
    ) {
      const user = this.store.users[0];
      if (user) {
        user.onboarding_complete = 1;
      }
      this.persist();
      return { lastInsertRowId: 0, changes: 1 };
    }

    if (normalized.includes('UPDATE users SET') && normalized.includes('onboarding_complete = 1')) {
      const user = this.store.users[0];
      if (user) {
        user.profile = params[0];
        user.xp_gain_modifier = params[1];
        user.decay_speed_modifier = params[2];
        user.retention_shield = params[3];
        user.practice_frequency = params[4];
        user.focus_preference = params[5];
        user.retention_concern = params[6];
        user.goal_type = params[7];
        user.onboarding_complete = 1;
      }
      this.persist();
      return { lastInsertRowId: 0, changes: 1 };
    }

    if (normalized.includes('UPDATE users SET practice_reminder_enabled')) {
      const user = this.store.users[0];
      if (user) {
        user.practice_reminder_enabled = params[0];
        user.practice_reminder_hour = params[1];
      }
      this.persist();
      return { lastInsertRowId: 0, changes: 1 };
    }

    if (normalized.includes('UPDATE users SET selected_skin')) {
      const user = this.store.users[0];
      if (user) user.selected_skin = params[0];
      this.persist();
      return { lastInsertRowId: 0, changes: 1 };
    }

    if (normalized.includes('UPDATE users SET tree_view_mode')) {
      const user = this.store.users[0];
      if (user) user.tree_view_mode = params[0];
      this.persist();
      return { lastInsertRowId: 0, changes: 1 };
    }

    if (normalized === 'UPDATE nodes SET parent_id = ? WHERE id = ?') {
      const [parentId, nodeId] = params as [number, number];
      const node = this.store.nodes.find((n) => n.id === nodeId);
      if (node) {
        node.parent_id = parentId;
        this.persist();
      }
      return { lastInsertRowId: 0, changes: node ? 1 : 0 };
    }

    if (normalized === 'UPDATE nodes SET pos_x = ?, pos_y = ? WHERE id = ?') {
      const [posX, posY, id] = params as [number, number, number];
      const node = this.store.nodes.find((n) => n.id === id);
      if (node) {
        node.pos_x = posX;
        node.pos_y = posY;
      }
      this.persist();
      return { lastInsertRowId: 0, changes: node ? 1 : 0 };
    }

    if (
      normalized ===
      'UPDATE nodes SET pos_x = ?, pos_y = ?, origin_pos_x = ?, origin_pos_y = ? WHERE id = ?'
    ) {
      const [posX, posY, originX, originY, id] = params as [
        number,
        number,
        number,
        number,
        number,
      ];
      const node = this.store.nodes.find((n) => n.id === id);
      if (node) {
        node.pos_x = posX;
        node.pos_y = posY;
        node.origin_pos_x = originX;
        node.origin_pos_y = originY;
      }
      this.persist();
      return { lastInsertRowId: 0, changes: node ? 1 : 0 };
    }

    if (
      normalized ===
      "UPDATE nodes SET pos_x = ?, pos_y = ? WHERE layer IN ('root', 'guide') AND macro_area = ?"
    ) {
      const [posX, posY, macroArea] = params as [number, number, string];
      let changes = 0;
      for (const node of this.store.nodes) {
        if ((node.layer === 'root' || node.layer === 'guide') && node.macro_area === macroArea) {
          node.pos_x = posX;
          node.pos_y = posY;
          node.layer = 'root';
          changes += 1;
        }
      }
      if (changes > 0) this.persist();
      return { lastInsertRowId: 0, changes };
    }

    if (normalized.includes("UPDATE nodes SET name = ?") && normalized.includes("layer = 'root'")) {
      const [name, type, macroArea, slug, posX, posY, id] = params as [
        string,
        string,
        string,
        string,
        number,
        number,
        number,
      ];
      const node = this.store.nodes.find((n) => n.id === id);
      if (node) {
        node.name = name;
        node.type = type;
        node.layer = 'root';
        node.macro_area = macroArea;
        node.slug = slug;
        node.pos_x = posX;
        node.pos_y = posY;
        node.guide_url = null;
        this.persist();
      }
      return { lastInsertRowId: 0, changes: node ? 1 : 0 };
    }

    if (
      normalized.includes("UPDATE nodes SET name = ?") &&
      normalized.includes('macro_area = ?') &&
      normalized.includes('color_role = ?') &&
      normalized.includes('decay_categoria = ?')
    ) {
      const [
        name,
        type,
        macroArea,
        posX,
        posY,
        parentId,
        guideUrl,
        colorRole,
        originX,
        originY,
        decayCategoria,
        id,
      ] = params as [
        string,
        string,
        string,
        number,
        number,
        number,
        string | null,
        string,
        number,
        number,
        string,
        number,
      ];
      const node = this.store.nodes.find((n) => n.id === id);
      if (node) {
        node.name = name;
        node.type = type;
        node.macro_area = macroArea;
        node.pos_x = posX;
        node.pos_y = posY;
        node.parent_id = parentId;
        node.guide_url = guideUrl;
        node.color_role = colorRole;
        node.origin_pos_x = originX;
        node.origin_pos_y = originY;
        node.decay_categoria = decayCategoria;
        this.persist();
      }
      return { lastInsertRowId: 0, changes: node ? 1 : 0 };
    }

    if (
      normalized.includes("UPDATE nodes SET name = ?") &&
      normalized.includes('macro_area = ?') &&
      normalized.includes('color_role = ?')
    ) {
      const [
        name,
        type,
        macroArea,
        posX,
        posY,
        parentId,
        guideUrl,
        colorRole,
        originX,
        originY,
        id,
      ] = params as [
        string,
        string,
        string,
        number,
        number,
        number,
        string | null,
        string,
        number,
        number,
        number,
      ];
      const node = this.store.nodes.find((n) => n.id === id);
      if (node) {
        node.name = name;
        node.type = type;
        node.macro_area = macroArea;
        node.pos_x = posX;
        node.pos_y = posY;
        node.parent_id = parentId;
        node.guide_url = guideUrl;
        node.color_role = colorRole;
        node.origin_pos_x = originX;
        node.origin_pos_y = originY;
        this.persist();
      }
      return { lastInsertRowId: 0, changes: node ? 1 : 0 };
    }

    if (
      normalized ===
      'UPDATE nodes SET pos_x = ?, pos_y = ?, parent_id = ?, origin_pos_x = ?, origin_pos_y = ? WHERE id = ?'
    ) {
      const [posX, posY, parentId, originX, originY, id] = params as [
        number,
        number,
        number,
        number,
        number,
        number,
      ];
      const node = this.store.nodes.find((n) => n.id === id);
      if (node) {
        node.pos_x = posX;
        node.pos_y = posY;
        node.parent_id = parentId;
        node.origin_pos_x = originX;
        node.origin_pos_y = originY;
        this.persist();
      }
      return { lastInsertRowId: 0, changes: node ? 1 : 0 };
    }

    if (normalized.includes('UPDATE nodes SET slug = ? WHERE slug = ?')) {
      const [nextSlug, prevSlug] = params as [string, string];
      let changes = 0;
      for (const node of this.store.nodes) {
        if (node.slug === prevSlug && (node.layer === 'root' || node.layer === 'guide')) {
          node.slug = nextSlug;
          node.layer = 'root';
          changes += 1;
        }
      }
      if (changes > 0) this.persist();
      return { lastInsertRowId: 0, changes };
    }

    if (normalized === "UPDATE nodes SET slug = ?, layer = 'root' WHERE id = ?") {
      const [slug, id] = params as [string, number];
      const node = this.store.nodes.find((n) => n.id === id);
      if (node) {
        node.slug = slug;
        node.layer = 'root';
        this.persist();
      }
      return { lastInsertRowId: 0, changes: node ? 1 : 0 };
    }

    if (normalized === 'UPDATE nodes SET decay_categoria = ? WHERE id = ?') {
      const [decayCategoria, nodeId] = params as [string, number];
      const node = this.store.nodes.find((n) => n.id === nodeId);
      if (node) {
        node.decay_categoria = decayCategoria;
        this.persist();
      }
      return { lastInsertRowId: 0, changes: node ? 1 : 0 };
    }

    if (
      normalized ===
      "UPDATE nodes SET name = ?, layer = 'custom', slug = ?, decay_categoria = ? WHERE id = ?"
    ) {
      const [name, slug, decayCategoria, nodeId] = params as [string, string, string, number];
      const node = this.store.nodes.find((n) => n.id === nodeId);
      if (node) {
        node.name = name;
        node.layer = 'custom';
        node.slug = slug;
        node.decay_categoria = decayCategoria;
        this.persist();
      }
      return { lastInsertRowId: 0, changes: node ? 1 : 0 };
    }

    if (normalized.includes('INSERT INTO nodes')) {
      const id = this.store.nextNodeId++;
      let inserted = false;

      if (normalized.includes("'root'")) {
        const [name, type, macroArea, posX, posY, slug] = params as [
          string,
          string,
          string,
          number,
          number,
          string,
        ];
        this.store.nodes.push({
          id,
          name,
          type,
          layer: 'root',
          macro_area: macroArea,
          xp: 10,
          level: 1,
          pos_x: posX,
          pos_y: posY,
          last_practice_at: null,
          weekly_xp_sessions: 0,
          week_start_at: null,
          guide_url: null,
          slug,
          parent_id: null,
          created_at: nowIso(),
        });
        inserted = true;
      } else if (normalized.includes("'guide'")) {
        const [name, type, macroArea, posX, posY, guideUrl] = params as [
          string,
          string,
          string,
          number,
          number,
          string,
        ];
        this.store.nodes.push({
          id,
          name,
          type,
          layer: 'guide',
          macro_area: macroArea,
          xp: 10,
          level: 1,
          pos_x: posX,
          pos_y: posY,
          last_practice_at: null,
          weekly_xp_sessions: 0,
          week_start_at: null,
          guide_url: guideUrl,
          slug: null,
          parent_id: null,
          created_at: nowIso(),
        });
        inserted = true;
      } else if (normalized.includes("'locked'")) {
        const [
          name,
          type,
          macroArea,
          posX,
          posY,
          parentId,
          slug,
          guideUrl,
          colorRole,
          originX,
          originY,
        ] = params as [
          string,
          string,
          string,
          number,
          number,
          number,
          string,
          string | null,
          string,
          number,
          number,
        ];
        this.store.nodes.push({
          id,
          name,
          type,
          layer: 'locked',
          macro_area: macroArea,
          xp: 0,
          level: 1,
          pos_x: posX,
          pos_y: posY,
          origin_pos_x: originX,
          origin_pos_y: originY,
          last_practice_at: null,
          weekly_xp_sessions: 0,
          week_start_at: null,
          guide_url: guideUrl,
          slug,
          color_role: colorRole,
          parent_id: parentId,
          created_at: nowIso(),
        });
        inserted = true;
      } else if (normalized.includes("'wildcard'")) {
        const [name, type, macroArea, posX, posY, parentId, slug, originX, originY] = params as [
          string,
          string,
          string,
          number,
          number,
          number,
          string,
          number,
          number,
        ];
        this.store.nodes.push({
          id,
          name,
          type,
          layer: 'wildcard',
          macro_area: macroArea,
          xp: 0,
          level: 1,
          pos_x: posX,
          pos_y: posY,
          origin_pos_x: originX,
          origin_pos_y: originY,
          last_practice_at: null,
          weekly_xp_sessions: 0,
          week_start_at: null,
          guide_url: null,
          slug,
          parent_id: parentId,
          created_at: nowIso(),
        });
        inserted = true;
      } else if (normalized.includes("'custom'") && normalized.includes('decay_categoria')) {
        const [
          name,
          type,
          macroArea,
          posX,
          posY,
          parentId,
          slug,
          guideUrl,
          originX,
          originY,
          decayCategoria,
        ] = params as [
          string,
          string,
          string,
          number,
          number,
          number | null,
          string | null,
          string | null,
          number,
          number,
          string,
        ];
        this.store.nodes.push({
          id,
          name,
          type,
          layer: 'custom',
          macro_area: macroArea,
          xp: 0,
          level: 1,
          pos_x: posX,
          pos_y: posY,
          origin_pos_x: originX,
          origin_pos_y: originY,
          last_practice_at: null,
          weekly_xp_sessions: 0,
          week_start_at: null,
          guide_url: guideUrl,
          slug,
          parent_id: parentId,
          decay_categoria: decayCategoria,
          created_at: nowIso(),
        });
        inserted = true;
      } else if (normalized.includes("'custom'") && normalized.includes('origin_pos_x')) {
        const [name, type, macroArea, posX, posY, parentId, slug, guideUrl, originX, originY] =
          params as [
            string,
            string,
            string,
            number,
            number,
            number | null,
            string | null,
            string | null,
            number,
            number,
          ];
        this.store.nodes.push({
          id,
          name,
          type,
          layer: 'custom',
          macro_area: macroArea,
          xp: 0,
          level: 1,
          pos_x: posX,
          pos_y: posY,
          origin_pos_x: originX,
          origin_pos_y: originY,
          last_practice_at: null,
          weekly_xp_sessions: 0,
          week_start_at: null,
          guide_url: guideUrl,
          slug,
          parent_id: parentId,
          created_at: nowIso(),
        });
        inserted = true;
      }

      if (inserted) {
        this.persist();
        return { lastInsertRowId: id, changes: 1 };
      }

      this.store.nextNodeId -= 1;
      return { lastInsertRowId: 0, changes: 0 };
    }

    if (normalized.includes('INSERT INTO history_logs')) {
      const id = this.store.nextHistoryId++;
      const [nodeId, action, amount] = params as [number, string, number];
      this.store.history_logs.push({
        id,
        node_id: nodeId,
        action,
        amount,
        timestamp: nowIso(),
      });
      this.persist();
      return { lastInsertRowId: id, changes: 1 };
    }

    if (normalized.includes('is_deleted = 1')) {
      const nodeId = normalized.includes('progress_updated_at')
        ? (params as [string, number])[1]
        : (params as [number])[0];
      const progressUpdated = normalized.includes('progress_updated_at')
        ? (params as [string, number])[0]
        : null;
      const node = this.store.nodes.find((n) => n.id === nodeId);
      if (node) {
        node.is_deleted = 1;
        if (progressUpdated) node.progress_updated_at = progressUpdated;
      }
      this.persist();
      return { lastInsertRowId: 0, changes: node ? 1 : 0 };
    }

    if (normalized.includes('is_deleted = 0')) {
      const nodeId = normalized.includes('progress_updated_at')
        ? (params as [string, number])[1]
        : (params as [number])[0];
      const progressUpdated = normalized.includes('progress_updated_at')
        ? (params as [string, number])[0]
        : null;
      const node = this.store.nodes.find((n) => n.id === nodeId);
      if (node) {
        node.is_deleted = 0;
        if (progressUpdated) node.progress_updated_at = progressUpdated;
      }
      this.persist();
      return { lastInsertRowId: 0, changes: node ? 1 : 0 };
    }

    if (normalized.includes("layer = 'dormant'")) {
      const [posX, posY, originX, originY, nodeId] = params as [
        number,
        number,
        number,
        number,
        number,
      ];
      const node = this.store.nodes.find((n) => n.id === nodeId);
      if (node) {
        node.layer = 'dormant';
        node.xp = 0;
        node.level = 1;
        node.last_practice_at = null;
        node.weekly_xp_sessions = 0;
        node.week_start_at = null;
        node.pos_x = posX;
        node.pos_y = posY;
        node.origin_pos_x = originX;
        node.origin_pos_y = originY;
      }
      this.persist();
      return { lastInsertRowId: 0, changes: node ? 1 : 0 };
    }

    if (
      normalized.includes("layer = 'custom'") &&
      normalized.includes('week_start_at = NULL') &&
      normalized.includes('weekly_xp_sessions = 0')
    ) {
      const [nodeId] = params as [number];
      const node = this.store.nodes.find((n) => n.id === nodeId);
      if (node) {
        node.layer = 'custom';
        node.xp = 0;
        node.level = 1;
        node.last_practice_at = null;
        node.weekly_xp_sessions = 0;
        node.week_start_at = null;
      }
      this.persist();
      return { lastInsertRowId: 0, changes: node ? 1 : 0 };
    }

    if (normalized.includes('origin_pos_x = pos_x')) {
      for (const node of this.store.nodes) {
        if (
          node.origin_pos_x == null &&
          (node.layer === 'custom' || node.layer === 'dormant')
        ) {
          node.origin_pos_x = node.pos_x;
          node.origin_pos_y = node.pos_y;
        }
      }
      this.persist();
      return { lastInsertRowId: 0, changes: 1 };
    }

    if (normalized === "UPDATE nodes SET layer = 'custom' WHERE id = ?") {
      const [nodeId] = params as [number];
      const node = this.store.nodes.find((n) => n.id === nodeId);
      if (node) {
        node.layer = 'custom';
        this.persist();
      }
      return { lastInsertRowId: 0, changes: node ? 1 : 0 };
    }

    /** Check diario — debe ir ANTES del handler genérico de weekly_xp_sessions. */
    if (normalized.includes('UPDATE nodes SET daily_verified_at = ?')) {
      if (normalized.includes('session_quality = ?')) {
        const [
          verifiedAt,
          sessionQuality,
          sessionQualityHistory,
          progressUpdated,
          newXp,
          newLevel,
          lastPracticeAt,
          weeklyXpSessions,
          weekStartAt,
          nodeId,
        ] = params as [
          string,
          string,
          string,
          string,
          number,
          number,
          string | null,
          number,
          string | null,
          number,
        ];
        const node = this.store.nodes.find((n) => n.id === nodeId);
        if (node) {
          node.daily_verified_at = verifiedAt;
          node.session_quality = sessionQuality;
          node.session_quality_history = sessionQualityHistory;
          node.progress_updated_at = progressUpdated;
          node.xp = newXp;
          node.level = newLevel;
          node.last_practice_at = lastPracticeAt;
          node.weekly_xp_sessions = weeklyXpSessions;
          node.week_start_at = weekStartAt;
          if (node.layer === 'locked') {
            node.layer = 'custom';
          }
        }
        this.persist();
        return { lastInsertRowId: 0, changes: node ? 1 : 0 };
      }

      if (normalized.includes('progress_updated_at')) {
        const [verifiedAt, progressUpdated, nodeId] = params as [string, string, number];
        const node = this.store.nodes.find((n) => n.id === nodeId);
        if (node) {
          node.daily_verified_at = verifiedAt;
          node.progress_updated_at = progressUpdated;
        }
        this.persist();
        return { lastInsertRowId: 0, changes: node ? 1 : 0 };
      }

      const [verifiedAt, nodeId] = params as [string, number];
      const node = this.store.nodes.find((n) => n.id === nodeId);
      if (node) {
        node.daily_verified_at = verifiedAt;
      }
      this.persist();
      return { lastInsertRowId: 0, changes: node ? 1 : 0 };
    }

    if (normalized === 'DELETE FROM history_logs WHERE node_id = ?') {
      const [nodeId] = params as [number];
      const before = this.store.history_logs.length;
      this.store.history_logs = this.store.history_logs.filter((h) => h.node_id !== nodeId);
      if (this.store.history_logs.length !== before) this.persist();
      return { lastInsertRowId: 0, changes: before - this.store.history_logs.length };
    }

    if (normalized.includes('INSERT INTO nen_history')) {
      const [
        recordedDate,
        intensification,
        transformation,
        specialization,
        emission,
        manipulation,
        materialization,
      ] = params as [string, number, number, number, number, number, number];
      const existing = this.store.nen_history.find(
        (row) => row.recorded_date === recordedDate
      );
      if (existing) {
        existing.intensification = intensification;
        existing.transformation = transformation;
        existing.specialization = specialization;
        existing.emission = emission;
        existing.manipulation = manipulation;
        existing.materialization = materialization;
      } else {
        this.store.nen_history.push({
          id: this.store.nextNenHistoryId++,
          recorded_date: recordedDate,
          intensification,
          transformation,
          specialization,
          emission,
          manipulation,
          materialization,
          created_at: nowIso(),
        });
      }
      this.persist();
      return { lastInsertRowId: 0, changes: 1 };
    }

    if (normalized === 'DELETE FROM nen_history WHERE recorded_date < ?') {
      const [cutoff] = params as [string];
      const before = this.store.nen_history.length;
      this.store.nen_history = this.store.nen_history.filter(
        (row) => String(row.recorded_date) >= cutoff
      );
      if (this.store.nen_history.length !== before) this.persist();
      return { lastInsertRowId: 0, changes: before - this.store.nen_history.length };
    }

    if (
      normalized ===
      'UPDATE nodes SET xp = ?, level = ?, last_practice_at = ?, weekly_xp_sessions = ?, week_start_at = ? WHERE id = ?'
    ) {
      const [newXp, newLevel, lastPractice, sessions, weekStart, nodeId] = params as [
        number,
        number,
        string,
        number,
        string,
        number,
      ];
      const node = this.store.nodes.find((n) => n.id === nodeId);
      if (node) {
        node.xp = newXp;
        node.level = newLevel;
        node.last_practice_at = lastPractice;
        node.weekly_xp_sessions = sessions;
        node.week_start_at = weekStart;
      }
      this.persist();
      return { lastInsertRowId: 0, changes: node ? 1 : 0 };
    }

    if (normalized.includes('UPDATE nodes SET xp = ?, level = ?, last_practice_at = ? WHERE id = ?')) {
      const [newXp, newLevel, lastPractice, nodeId] = params as [number, number, string, number];
      const node = this.store.nodes.find((n) => n.id === nodeId);
      if (node) {
        node.xp = newXp;
        node.level = newLevel;
        node.last_practice_at = lastPractice;
      }
      this.persist();
      return { lastInsertRowId: 0, changes: node ? 1 : 0 };
    }

    if (normalized === 'UPDATE nodes SET xp = ?, level = ? WHERE id = ?') {
      const [newXp, newLevel, nodeId] = params as [number, number, number];
      const node = this.store.nodes.find((n) => n.id === nodeId);
      if (node) {
        node.xp = newXp;
        node.level = newLevel;
      }
      this.persist();
      return { lastInsertRowId: 0, changes: node ? 1 : 0 };
    }

    if (normalized === 'DELETE FROM nodes WHERE id = ?') {
      const [nodeId] = params as [number];
      const before = this.store.nodes.length;
      this.store.nodes = this.store.nodes.filter((n) => n.id !== nodeId);
      for (const node of this.store.nodes) {
        if (node.parent_id === nodeId) node.parent_id = null;
      }
      if (this.store.nodes.length !== before) this.persist();
      return { lastInsertRowId: 0, changes: before - this.store.nodes.length };
    }

    return { lastInsertRowId: 0, changes: 0 };
  }
}

let dbInstance: WebDatabase | null = null;

export function resetWebDatabase(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_BACKUP_KEY);
  }
  dbInstance = null;
}

export async function getDatabase(): Promise<AppDatabase> {
  if (!dbInstance) {
    dbInstance = new WebDatabase();
    await bootstrapDb(dbInstance);
  }
  return dbInstance;
}
