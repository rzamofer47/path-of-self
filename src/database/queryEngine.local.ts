import { calibrateProfile } from './onboardingCalibration';
import { GUIDE_SUGGESTIONS } from '@/src/data/guideSuggestions';
import { getDatabase } from './localSchema';
import { isRootLayer } from '@/src/utils/nodeColors';
import { isRootNode } from '@/src/utils/nodeMenuPolicy';
import { resolveShadowOriginPosition } from '@/src/utils/shadowNodePlacement';
import { layoutShadowLayer, clearShadowLayoutCache } from '@/src/utils/shadowRadialRepulsion';
import { resolveDisciplineChildren } from '@/src/data/disciplineCatalog';
import { inferXpFeedbackEvent, type XpFeedbackPayload } from '@/src/utils/xpFeedback';
import { wildcardSlugForArea } from '@/src/utils/wildcardNodes';
import { touchNodeProgressUpdated } from '@/src/database/sync/progressSync';
import { resetLocalPersistence } from '@/src/database/persistence';
import {
  computeOutwardChildPosition,
  nodeCenterToLogical,
  resolveOrbitPlacement,
  resolveSubSkillPlacement,
} from '@/src/utils/polarLayout';
import { resolveCustomNodeSectorPlacement } from '@/src/utils/nodeSectorLayout';
import { getNodeCenter } from '@/src/utils/treeLayout';
import { isVisualDecayTrackedNode } from '@/src/utils/visualDecay';
import {
  cancelDecayAlert,
  scheduleDecayAlert,
} from '@/src/hooks/usePracticeReminder';
import {
  calculateDecayForNode,
  DECAY_CONFIG,
  getWeekStart,
  isSameWeek,
  levelFromXp,
} from './decayConfig';
import { asRow, mapNode, mapUser } from './mappers';
import {
  CalidadSesion,
  DecayCategoria,
  MacroArea,
  NodeType,
  OnboardingAnswers,
  SkillNode,
  SkinId,
  TreeViewMode,
  User,
} from '@/src/types';
import { XP_PER_SESSION } from '@/src/config/progressionConfig';
import { DEFAULT_DECAY_CATEGORIA } from '@/src/config/nenDecayConfig';
import { appendSessionQualityHistory, sessionXpMultiplier } from '@/src/utils/sessionQuality';

export { DECAY_CONFIG, calculateDecayForNode } from './decayConfig';

export async function getUser(): Promise<User | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT * FROM users LIMIT 1');
  return row ? mapUser(asRow(row)) : null;
}

export async function completeOnboarding(answers: OnboardingAnswers): Promise<User> {
  const db = await getDatabase();
  const cal = calibrateProfile(answers);

  await db.runAsync(
    `UPDATE users SET
      profile = ?,
      xp_gain_modifier = ?,
      decay_speed_modifier = ?,
      retention_shield = ?,
      practice_frequency = ?,
      focus_preference = ?,
      retention_concern = ?,
      goal_type = ?,
      onboarding_complete = 1
     WHERE id = (SELECT id FROM users LIMIT 1)`,
    cal.profile,
    cal.xpGainModifier,
    cal.decaySpeedModifier,
    cal.retentionShield ? 1 : 0,
    answers.practiceFrequency,
    answers.focusPreference,
    answers.retentionConcern ? 1 : 0,
    answers.goalType
  );

  const user = await getUser();
  if (!user) throw new Error('Usuario no encontrado tras onboarding');
  return user;
}

export async function updatePracticeReminder(enabled: boolean, hour: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE users SET practice_reminder_enabled = ?, practice_reminder_hour = ?
     WHERE id = (SELECT id FROM users LIMIT 1)`,
    enabled ? 1 : 0,
    hour
  );
}

export async function updateSelectedSkin(skinId: SkinId): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE users SET selected_skin = ? WHERE id = (SELECT id FROM users LIMIT 1)',
    skinId
  );
}

export async function updateTreeViewMode(mode: TreeViewMode): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE users SET tree_view_mode = ? WHERE id = (SELECT id FROM users LIMIT 1)',
    mode
  );
}

export async function updateNodePosition(
  nodeId: number,
  posX: number,
  posY: number
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE nodes SET pos_x = ?, pos_y = ?, origin_pos_x = ?, origin_pos_y = ? WHERE id = ?',
    posX,
    posY,
    posX,
    posY,
    nodeId
  );
}

async function findRootParentId(macroArea: MacroArea): Promise<number | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync(
    `SELECT id FROM nodes WHERE layer = 'root' AND macro_area = ? LIMIT 1`,
    macroArea
  );
  return row ? (asRow(row).id as number) : null;
}

export async function getAllNodes(): Promise<SkillNode[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT * FROM nodes ORDER BY id ASC');
  return rows.map((row) => mapNode(asRow(row)));
}

let virtualGuideId = -1000;

/** Nodos dormidos persistidos en la capa oscura (inframundo). */
export function getDormantShadowNodes(userNodes: SkillNode[]): SkillNode[] {
  return userNodes
    .filter((n) => n.layer === 'dormant')
    .map((n) => {
      const origin = resolveShadowOriginPosition(n, userNodes);
      return { ...n, posX: origin.posX, posY: origin.posY };
    });
}

/** Nodos guía predefinidos no adoptados (virtuales, id negativo). */
export function getSuggestedGuideNodes(userNodes: SkillNode[]): SkillNode[] {
  const roots = userNodes.filter((n) => isRootLayer(n));
  const customNodes = userNodes.filter((n) => n.layer === 'custom');
  const dormantNodes = userNodes.filter((n) => n.layer === 'dormant');
  const lockedNodes = userNodes.filter((n) => n.layer === 'locked');
  const adoptedSlugs = new Set(
    customNodes.map((n) => n.slug).filter((slug): slug is string => Boolean(slug))
  );
  const adoptedNames = new Set(customNodes.map((n) => n.name.toLowerCase()));
  const dormantSlugs = new Set(
    dormantNodes.map((n) => n.slug).filter((slug): slug is string => Boolean(slug))
  );
  const dormantNames = new Set(dormantNodes.map((n) => n.name.toLowerCase()));
  const lockedSlugs = new Set(
    lockedNodes.map((n) => n.slug).filter((slug): slug is string => Boolean(slug))
  );
  const lockedNames = new Set(lockedNodes.map((n) => n.name.toLowerCase()));
  const suggestions: SkillNode[] = [];

  const macroAreas: MacroArea[] = [
    'physical',
    'intellectual',
    'mental_emotional',
    'productive',
  ];

  for (const macroArea of macroAreas) {
    const root = roots.find((r) => r.macroArea === macroArea);
    if (!root) continue;

    const areaCustom = customNodes.filter((n) => n.macroArea === macroArea);
    const guidesToPlace = GUIDE_SUGGESTIONS[macroArea].filter(
      (guide) =>
        !adoptedSlugs.has(guide.slug) &&
        !adoptedNames.has(guide.name.toLowerCase()) &&
        !dormantSlugs.has(guide.slug) &&
        !dormantNames.has(guide.name.toLowerCase()) &&
        !lockedSlugs.has(guide.slug) &&
        !lockedNames.has(guide.name.toLowerCase())
    );
    const totalSiblings = areaCustom.length + guidesToPlace.length;

    const rootCenter = getNodeCenter(root);
    const parentLog = nodeCenterToLogical(rootCenter.x, rootCenter.y);

    guidesToPlace.forEach((guide, idx) => {
      const childIndex = areaCustom.length + idx;
      const pos = computeOutwardChildPosition(
        parentLog.x,
        parentLog.y,
        childIndex,
        macroArea,
        totalSiblings,
        { depth: 1, parentIsRoot: true }
      );

      suggestions.push({
        id: virtualGuideId--,
        slug: guide.slug,
        name: guide.name,
        type: guide.type,
        layer: 'guide',
        macroArea: guide.macroArea,
        xp: 0,
        level: 1,
        posX: pos.posX,
        posY: pos.posY,
        lastPracticeAt: null,
        dailyVerifiedAt: null,
        sessionQuality: null,
        sessionQualityHistory: null,
        weeklyXpSessions: 0,
        weekStartAt: null,
        guideUrl: guide.guideUrl ?? null,
        colorRole: 'standard',
        parentId: root.id,
        originPosX: null,
        originPosY: null,
        isDeleted: false,
        decayCategoria: null,
        createdAt: new Date().toISOString(),
      });
    });
  }

  return suggestions;
}

function collectShadowBaseline(userNodes: SkillNode[]): SkillNode[] {
  const dormant = getDormantShadowNodes(userNodes);
  const virtual = getSuggestedGuideNodes(userNodes);
  return [...dormant, ...virtual];
}

/** Nodos bloqueados del catálogo predefinido (fondo del mapa). */
export function getLockedCatalogNodes(userNodes: SkillNode[]): SkillNode[] {
  return userNodes.filter((n) => n.layer === 'locked');
}

export async function getDisplayNodes(): Promise<SkillNode[]> {
  const dbNodes = await getAllNodes();
  const lockedBackground = getLockedCatalogNodes(dbNodes);
  const surface = dbNodes.filter(
    (n) => n.layer !== 'dormant' && n.layer !== 'locked' && !n.isDeleted
  );
  const shadowBaseline = collectShadowBaseline(dbNodes);
  const shadow = layoutShadowLayer(surface, shadowBaseline);
  return [...lockedBackground, ...surface, ...shadow];
}

export interface CreateCustomNodeOptions {
  slug?: string | null;
  guideUrl?: string | null;
  decayCategoria?: DecayCategoria | null;
}

export async function createCustomNode(
  name: string,
  type: NodeType,
  macroArea: MacroArea,
  _posX: number,
  _posY: number,
  explicitParentId?: number | null,
  options?: CreateCustomNodeOptions
): Promise<SkillNode> {
  const db = await getDatabase();
  const allNodes = await getAllNodes();
  const parentId =
    explicitParentId !== undefined
      ? explicitParentId
      : await findRootParentId(macroArea);
  const parent =
    parentId != null ? allNodes.find((node) => node.id === parentId) ?? null : null;

  const slug = options?.slug ?? null;
  const guideUrl = options?.guideUrl ?? null;
  const decayCategoria = options?.decayCategoria ?? DEFAULT_DECAY_CATEGORIA;

  const draft: SkillNode = {
    id: -1,
    slug,
    name,
    type,
    layer: 'custom',
    macroArea,
    xp: 0,
    level: 1,
    posX: 0,
    posY: 0,
    lastPracticeAt: null,
    weeklyXpSessions: 0,
    weekStartAt: null,
    dailyVerifiedAt: null,
    sessionQuality: null,
    sessionQualityHistory: null,
    guideUrl,
    colorRole: 'standard',
    parentId: parent?.id ?? parentId,
    originPosX: null,
    originPosY: null,
    isDeleted: false,
    decayCategoria,
    createdAt: new Date().toISOString(),
  };

  const placement = parent
    ? resolveCustomNodeSectorPlacement(allNodes, draft, parent)
    : resolveOrbitPlacement(allNodes, macroArea);

  const posX = placement.posX;
  const posY = placement.posY;
  const resolvedParentId = parent?.id ?? parentId;

  const result = await db.runAsync(
    `INSERT INTO nodes (name, type, layer, macro_area, pos_x, pos_y, parent_id, slug, guide_url, origin_pos_x, origin_pos_y, decay_categoria)
     VALUES (?, ?, 'custom', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    name,
    type,
    macroArea,
    posX,
    posY,
    resolvedParentId,
    slug,
    guideUrl,
    posX,
    posY,
    decayCategoria
  );

  const nodeId = result.lastInsertRowId;
  await db.runAsync(
    `INSERT INTO history_logs (node_id, action, amount) VALUES (?, 'create', 0)`,
    nodeId
  );

  const row = await db.getFirstAsync('SELECT * FROM nodes WHERE id = ?', nodeId);
  if (!row) throw new Error('Nodo no creado');
  clearShadowLayoutCache();
  return mapNode(asRow(row));
}

export async function configureWildcardNode(
  nodeId: number,
  customName: string,
  decayCategoria: DecayCategoria = DEFAULT_DECAY_CATEGORIA
): Promise<{ success: boolean; message?: string; node?: SkillNode }> {
  const trimmed = customName.trim();
  if (!trimmed) {
    return { success: false, message: 'Escribe el nombre de tu disciplina' };
  }

  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT * FROM nodes WHERE id = ?', nodeId);
  if (!row) return { success: false, message: 'Nodo no encontrado' };

  const node = mapNode(asRow(row));
  if (node.layer !== 'wildcard') {
    return { success: false, message: 'Este nodo ya fue configurado' };
  }

  const { bundleKey, children } = resolveDisciplineChildren(trimmed, node.macroArea);
  const configuredSlug = `${wildcardSlugForArea(node.macroArea)}:${bundleKey}`;

  await db.runAsync(
    `UPDATE nodes SET name = ?, layer = 'custom', slug = ?, decay_categoria = ? WHERE id = ?`,
    trimmed,
    configuredSlug,
    decayCategoria,
    nodeId
  );

  let workingNodes = await getAllNodes();
  const parentNode = workingNodes.find((n) => n.id === nodeId)!;
  parentNode.name = trimmed;
  parentNode.layer = 'custom';
  parentNode.slug = configuredSlug;

  for (const child of children) {
    const existing = workingNodes.find((n) => n.slug === child.slug);
    if (existing) {
      if (existing.layer === 'locked') {
        await db.runAsync(
          `UPDATE nodes SET name = ?, type = ?, layer = 'custom', parent_id = ?, pos_x = ?, pos_y = ? WHERE id = ?`,
          child.name,
          child.type,
          nodeId,
          existing.posX,
          existing.posY,
          existing.id
        );
        workingNodes = await getAllNodes();
      }
      continue;
    }

    const placement = resolveSubSkillPlacement(workingNodes, parentNode);
    const result = await db.runAsync(
      `INSERT INTO nodes (name, type, layer, macro_area, pos_x, pos_y, parent_id, slug, guide_url, origin_pos_x, origin_pos_y)
       VALUES (?, ?, 'custom', ?, ?, ?, ?, ?, NULL, ?, ?)`,
      child.name,
      child.type,
      node.macroArea,
      placement.posX,
      placement.posY,
      nodeId,
      child.slug,
      placement.posX,
      placement.posY
    );

    await db.runAsync(
      `INSERT INTO history_logs (node_id, action, amount) VALUES (?, 'create', 0)`,
      result.lastInsertRowId
    );

    const createdRow = await db.getFirstAsync('SELECT * FROM nodes WHERE id = ?', result.lastInsertRowId);
    if (createdRow) {
      workingNodes = [...workingNodes, mapNode(asRow(createdRow))];
    }
  }

  await db.runAsync(
    `INSERT INTO history_logs (node_id, action, amount) VALUES (?, 'create', 0)`,
    nodeId
  );

  const updated = await db.getFirstAsync('SELECT * FROM nodes WHERE id = ?', nodeId);
  clearShadowLayoutCache();
  return { success: true, node: mapNode(asRow(updated!)) };
}

function collectDescendantIds(nodeId: number, nodes: SkillNode[]): number[] {
  const ids: number[] = [nodeId];
  for (const node of nodes) {
    if (node.parentId === nodeId) {
      ids.push(...collectDescendantIds(node.id, nodes));
    }
  }
  return ids;
}

export async function banishNodeToUnderworld(
  nodeId: number
): Promise<{ success: boolean; message?: string }> {
  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT * FROM nodes WHERE id = ?', nodeId);
  if (!row) return { success: false, message: 'Nodo no encontrado' };

  const node = mapNode(asRow(row));
  if (node.id <= 0) {
    return { success: false, message: 'Este nodo no se puede enviar al inframundo' };
  }
  if (isRootNode(node)) {
    return { success: false, message: 'Las raíces permanecen ancladas en la superficie' };
  }
  if (node.layer === 'dormant') {
    return { success: false, message: 'Este nodo ya está en el inframundo' };
  }

  const allNodes = await getAllNodes();
  const idsToBanish = collectDescendantIds(nodeId, allNodes).filter((id) => {
    const candidate = allNodes.find((n) => n.id === id);
    return candidate && !isRootNode(candidate) && candidate.layer !== 'dormant';
  });

  for (const id of idsToBanish) {
    const target = allNodes.find((n) => n.id === id)!;
    const snapshot = [...allNodes];
    const origin = resolveShadowOriginPosition(target, snapshot);
    const storedOriginX = target.originPosX ?? origin.posX;
    const storedOriginY = target.originPosY ?? origin.posY;

    await db.runAsync(
      `UPDATE nodes SET
        layer = 'dormant',
        xp = 0,
        level = 1,
        last_practice_at = NULL,
        daily_verified_at = NULL,
        weekly_xp_sessions = 0,
        week_start_at = NULL,
        pos_x = ?,
        pos_y = ?,
        origin_pos_x = ?,
        origin_pos_y = ?
       WHERE id = ?`,
      origin.posX,
      origin.posY,
      storedOriginX,
      storedOriginY,
      id
    );

    await cancelDecayAlert(id);
    await db.runAsync(
      `INSERT INTO history_logs (node_id, action, amount) VALUES (?, 'banish', 0)`,
      id
    );
  }

  clearShadowLayoutCache();
  return { success: true };
}

/** Borrado lógico — oculta del mapa preservando XP, nivel y posición. */
export async function softDeleteNode(
  nodeId: number
): Promise<{ success: boolean; message?: string }> {
  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT * FROM nodes WHERE id = ?', nodeId);
  if (!row) return { success: false, message: 'Nodo no encontrado' };

  const node = mapNode(asRow(row));
  if (node.id <= 0) {
    return { success: false, message: 'Este nodo no se puede archivar' };
  }
  if (isRootNode(node)) {
    return { success: false, message: 'Las raíces permanecen ancladas en la superficie' };
  }
  if (node.layer === 'locked') {
    return { success: false, message: 'Los nodos del catálogo no se pueden archivar' };
  }
  if (node.isDeleted) {
    return { success: false, message: 'Este nodo ya está en el inframundo' };
  }

  const allNodes = await getAllNodes();
  const idsToDelete = collectDescendantIds(nodeId, allNodes).filter((id) => {
    const candidate = allNodes.find((n) => n.id === id);
    return (
      candidate &&
      !isRootNode(candidate) &&
      candidate.layer !== 'locked' &&
      !candidate.isDeleted
    );
  });

  for (const id of idsToDelete) {
    await db.runAsync(
      'UPDATE nodes SET is_deleted = 1, progress_updated_at = ? WHERE id = ?',
      new Date().toISOString(),
      id
    );
    await db.runAsync(
      `INSERT INTO history_logs (node_id, action, amount) VALUES (?, 'banish', 0)`,
      id
    );
  }

  return { success: true };
}

export async function restoreDeletedNode(
  nodeId: number
): Promise<{ success: boolean; message?: string; node?: SkillNode }> {
  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT * FROM nodes WHERE id = ?', nodeId);
  if (!row) return { success: false, message: 'Nodo no encontrado' };

  const node = mapNode(asRow(row));
  if (!node.isDeleted) {
    return { success: false, message: 'Este nodo ya está visible en el mapa' };
  }

  await db.runAsync(
    'UPDATE nodes SET is_deleted = 0, progress_updated_at = ? WHERE id = ?',
    new Date().toISOString(),
    nodeId
  );
  await db.runAsync(
    `INSERT INTO history_logs (node_id, action, amount) VALUES (?, 'reactivate', 0)`,
    nodeId
  );

  const updated = await db.getFirstAsync('SELECT * FROM nodes WHERE id = ?', nodeId);
  if (!updated) return { success: false, message: 'Nodo no restaurado' };
  return { success: true, node: mapNode(asRow(updated)) };
}

/** @deprecated Usar banishNodeToUnderworld */
export const deleteCustomNode = banishNodeToUnderworld;

export async function reactivateNode(
  nodeId: number
): Promise<{ success: boolean; message?: string; node?: SkillNode }> {
  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT * FROM nodes WHERE id = ?', nodeId);
  if (!row) return { success: false, message: 'Nodo no encontrado' };

  const node = mapNode(asRow(row));
  if (node.layer !== 'dormant') {
    return { success: false, message: 'Solo se pueden reactivar nodos del inframundo' };
  }

  await db.runAsync(
    `UPDATE nodes SET
      layer = 'custom',
      xp = 0,
      level = 1,
      last_practice_at = NULL,
      daily_verified_at = NULL,
      weekly_xp_sessions = 0,
      week_start_at = NULL
     WHERE id = ?`,
    nodeId
  );

  await db.runAsync(
    `INSERT INTO history_logs (node_id, action, amount) VALUES (?, 'reactivate', 0)`,
    nodeId
  );

  const updated = await db.getFirstAsync('SELECT * FROM nodes WHERE id = ?', nodeId);
  if (!updated) return { success: false, message: 'Nodo no reactivado' };
  clearShadowLayoutCache();
  return { success: true, node: mapNode(asRow(updated)) };
}

export async function addXpToNode(
  nodeId: number,
  baseXp: number,
  user: User
): Promise<{ success: boolean; message?: string; node?: SkillNode; feedback?: XpFeedbackPayload }> {
  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT * FROM nodes WHERE id = ?', nodeId);
  if (!row) return { success: false, message: 'Nodo no encontrado' };

  const node = mapNode(asRow(row));
  const prevLevel = node.level;
  if (node.layer === 'guide' || node.id < 0 || node.layer === 'dormant') {
    return { success: false, message: 'Los nodos guía se adoptan con +' };
  }

  if (node.layer === 'locked') {
    await db.runAsync(`UPDATE nodes SET layer = 'custom' WHERE id = ?`, nodeId);
  }

  const now = new Date();
  let excessMessage: string | undefined;

  if (node.type === 'physical') {
    let sessions = node.weeklyXpSessions;
    if (!isSameWeek(node.weekStartAt, now)) sessions = 0;

    const isExcess = sessions >= DECAY_CONFIG.physical.maxWeeklySessions;
    if (isExcess) {
      excessMessage = 'Sesión de exceso: solo +10% XP. Descansa para recuperar al 100%.';
    }
    const xpMultiplier = isExcess ? 0.1 : 1;
    const xpGain = baseXp * user.xpGainModifier * xpMultiplier;

    const weekStart = isSameWeek(node.weekStartAt, now) ? node.weekStartAt! : getWeekStart(now);
    const newXp = node.xp + xpGain;

    await db.runAsync(
      `UPDATE nodes SET xp = ?, level = ?, last_practice_at = ?, weekly_xp_sessions = ?, week_start_at = ? WHERE id = ?`,
      newXp,
      levelFromXp(newXp),
      now.toISOString(),
      sessions + 1,
      weekStart,
      nodeId
    );

    await db.runAsync(
      `INSERT INTO history_logs (node_id, action, amount) VALUES (?, ?, ?)`,
      nodeId,
      isExcess ? 'xp_excess' : 'xp_gain',
      xpGain
    );
  } else {
    const xpGain = baseXp * user.xpGainModifier;
    const newXp = node.xp + xpGain;

    await db.runAsync(
      `UPDATE nodes SET xp = ?, level = ?, last_practice_at = ? WHERE id = ?`,
      newXp,
      levelFromXp(newXp),
      now.toISOString(),
      nodeId
    );

    await db.runAsync(
      `INSERT INTO history_logs (node_id, action, amount) VALUES (?, 'xp_gain', ?)`,
      nodeId,
      xpGain
    );
  }

  const updated = await db.getFirstAsync('SELECT * FROM nodes WHERE id = ?', nodeId);
  const updatedNode = mapNode(asRow(updated!));

  await cancelDecayAlert(nodeId);
  if (isVisualDecayTrackedNode(updatedNode)) {
    await scheduleDecayAlert(updatedNode);
  }

  const allNodes = await getAllNodes();
  const feedback = inferXpFeedbackEvent(prevLevel, updatedNode, allNodes);

  await touchNodeProgressUpdated(nodeId);

  return { success: true, node: updatedNode, message: excessMessage, feedback };
}

/** Marca la actividad como completada hoy y otorga XP según calidad de sesión. */
export async function setDailyVerification(
  nodeId: number,
  calidad: CalidadSesion = 'completa',
  user?: User | null
): Promise<{ success: boolean; message?: string; node?: SkillNode; feedback?: XpFeedbackPayload }> {
  if (nodeId <= 0) {
    return { success: false, message: 'Este nodo no admite verificación diaria' };
  }

  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT * FROM nodes WHERE id = ?', nodeId);
  if (!row) return { success: false, message: 'Nodo no encontrado' };

  const node = mapNode(asRow(row));
  if (
    node.layer === 'dormant' ||
    node.id < 0
  ) {
    return { success: false, message: 'Este nodo no admite verificación diaria' };
  }

  if (node.layer === 'locked') {
    await db.runAsync(`UPDATE nodes SET layer = 'custom' WHERE id = ?`, nodeId);
  }

  const prevLevel = node.level;
  const now = new Date();
  const nowIso = now.toISOString();
  const historyJson = JSON.stringify(
    appendSessionQualityHistory(node.sessionQualityHistory, calidad, now)
  );

  let newXp = node.xp;
  let newLevel = node.level;
  let lastPracticeAt = node.lastPracticeAt;
  let weeklyXpSessions = node.weeklyXpSessions;
  let weekStartAt = node.weekStartAt;
  let logAmount = 0;
  let excessMessage: string | undefined;

  if (user) {
    const baseXp = XP_PER_SESSION * sessionXpMultiplier(calidad);

    if (node.type === 'physical') {
      let sessions = node.weeklyXpSessions;
      if (!isSameWeek(node.weekStartAt, now)) sessions = 0;

      const isExcess = sessions >= DECAY_CONFIG.physical.maxWeeklySessions;
      if (isExcess) {
        excessMessage = 'Sesión de exceso: solo +10% XP. Descansa para recuperar al 100%.';
      }
      const xpMultiplier = isExcess ? 0.1 : 1;
      const xpGain = baseXp * user.xpGainModifier * xpMultiplier;
      logAmount = xpGain;
      newXp = node.xp + xpGain;
      newLevel = levelFromXp(newXp);
      lastPracticeAt = nowIso;
      weeklyXpSessions = sessions + 1;
      weekStartAt = isSameWeek(node.weekStartAt, now) ? node.weekStartAt! : getWeekStart(now);
    } else {
      const xpGain = baseXp * user.xpGainModifier;
      logAmount = xpGain;
      newXp = node.xp + xpGain;
      newLevel = levelFromXp(newXp);
      lastPracticeAt = nowIso;
    }
  }

  await db.runAsync(
    `UPDATE nodes SET
      daily_verified_at = ?,
      session_quality = ?,
      session_quality_history = ?,
      progress_updated_at = ?,
      xp = ?,
      level = ?,
      last_practice_at = ?,
      weekly_xp_sessions = ?,
      week_start_at = ?
     WHERE id = ?`,
    nowIso,
    calidad,
    historyJson,
    nowIso,
    newXp,
    newLevel,
    lastPracticeAt,
    weeklyXpSessions,
    weekStartAt,
    nodeId
  );
  await db.runAsync(
    `INSERT INTO history_logs (node_id, action, amount) VALUES (?, 'daily_check', ?)`,
    nodeId,
    logAmount
  );

  const updated = await db.getFirstAsync('SELECT * FROM nodes WHERE id = ?', nodeId);
  if (!updated) return { success: false, message: 'No se pudo guardar la verificación' };

  const updatedNode = mapNode(asRow(updated));
  await cancelDecayAlert(nodeId);
  if (isVisualDecayTrackedNode(updatedNode)) {
    await scheduleDecayAlert(updatedNode);
  }

  let feedback: XpFeedbackPayload | undefined;
  if (user) {
    const allNodes = await getAllNodes();
    feedback = inferXpFeedbackEvent(prevLevel, updatedNode, allNodes);
  }

  await touchNodeProgressUpdated(nodeId);

  return { success: true, node: updatedNode, message: excessMessage, feedback };
}

export async function getNodeDailyCheckTimestamps(nodeId: number): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT timestamp FROM history_logs
     WHERE node_id = ? AND action = 'daily_check'
     ORDER BY timestamp ASC`,
    nodeId
  );
  return rows.map((row) => String(asRow(row).timestamp));
}

export async function getNodeStreakStatsForNode(node: SkillNode): Promise<import('@/src/utils/nodeStreak').NodeStreakStats> {
  const { computeNodeStreakStats } = await import('@/src/utils/nodeStreak');
  const { getCheckFrictionCategory } = await import('@/src/utils/visualDecay');
  const timestamps = await getNodeDailyCheckTimestamps(node.id);
  if (node.dailyVerifiedAt) {
    timestamps.push(node.dailyVerifiedAt);
  }
  return computeNodeStreakStats(timestamps, getCheckFrictionCategory(node));
}

export async function applyDecayToAllNodes(_user: User): Promise<SkillNode[]> {
  return getAllNodes();
}

export async function getAreaLevels(): Promise<Record<MacroArea, number>> {
  const nodes = await getAllNodes();
  const areas: Record<MacroArea, number> = {
    physical: 0,
    intellectual: 0,
    mental_emotional: 0,
    productive: 0,
  };

  for (const node of nodes) {
    if (node.layer === 'dormant') continue;
    areas[node.macroArea] += node.level;
  }

  return areas;
}

export async function getRecentHistory(limit = 20) {
  const db = await getDatabase();
  return db.getAllAsync(
    `SELECT h.*, n.name as node_name
     FROM history_logs h
     JOIN nodes n ON n.id = h.node_id
     ORDER BY h.timestamp DESC
     LIMIT ?`,
    limit
  );
}

/** Borra datos locales y reinicia el árbol (modo prueba). */
export async function resetTestMode(): Promise<void> {
  await resetLocalPersistence();
}
