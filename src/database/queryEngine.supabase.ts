import {
  calculateDecayForNode,
  DECAY_CONFIG,
  getWeekStart,
  isSameWeek,
  levelFromXp,
} from './decayConfig';
import { mapNode, mapUser } from './mappers';
import { calibrateProfile } from './onboardingCalibration';
import { resolveDisciplineChildren } from '@/src/data/disciplineCatalog';
import { isRootNode } from '@/src/utils/nodeMenuPolicy';
import { wildcardSlugForArea } from '@/src/utils/wildcardNodes';
import { resolveSubSkillPlacement } from '@/src/utils/polarLayout';
import { resolveShadowOriginPosition } from '@/src/utils/shadowNodePlacement';
import { prepareSupabaseUser } from './supabaseSeed';
import { getSupabase } from '@/src/lib/supabase';
import {
  MacroArea,
  NodeType,
  OnboardingAnswers,
  SkillNode,
  SkinId,
  TreeViewMode,
  User,
} from '@/src/types';

export { DECAY_CONFIG, calculateDecayForNode } from './decayConfig';

function mapProfileRow(row: Record<string, unknown>): User {
  return mapUser({ ...row, id: 1 });
}

function mapSupabaseNode(row: Record<string, unknown>): SkillNode {
  return mapNode({
    id: row.id,
    slug: row.slug,
    name: row.name,
    type: row.type,
    layer: row.layer,
    macro_area: row.macro_area,
    xp: row.xp,
    level: row.level,
    pos_x: row.pos_x,
    pos_y: row.pos_y,
    last_practice_at: row.last_practice_at,
    weekly_xp_sessions: row.weekly_xp_sessions,
    week_start_at: row.week_start_at,
    guide_url: row.guide_url,
    parent_id: row.parent_id,
    origin_pos_x: row.origin_pos_x,
    origin_pos_y: row.origin_pos_y,
    is_deleted: row.is_deleted,
    created_at: row.created_at,
  });
}

async function getAuthId(): Promise<string> {
  return prepareSupabaseUser();
}

export async function getUser(): Promise<User | null> {
  const authId = await getAuthId();
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_id', authId)
    .single();

  if (error || !data) return null;
  return mapProfileRow(data);
}

export async function completeOnboarding(answers: OnboardingAnswers): Promise<User> {
  const authId = await getAuthId();
  const supabase = getSupabase();
  const cal = calibrateProfile(answers);

  const { error } = await supabase
    .from('profiles')
    .update({
      profile: cal.profile,
      xp_gain_modifier: cal.xpGainModifier,
      decay_speed_modifier: cal.decaySpeedModifier,
      retention_shield: cal.retentionShield,
      practice_frequency: answers.practiceFrequency,
      focus_preference: answers.focusPreference,
      retention_concern: answers.retentionConcern,
      goal_type: answers.goalType,
      onboarding_complete: true,
    })
    .eq('auth_id', authId);

  if (error) throw error;

  const user = await getUser();
  if (!user) throw new Error('Usuario no encontrado tras onboarding');
  return user;
}

export async function updatePracticeReminder(enabled: boolean, hour: number): Promise<void> {
  const authId = await getAuthId();
  const { error } = await getSupabase()
    .from('profiles')
    .update({
      practice_reminder_enabled: enabled,
      practice_reminder_hour: hour,
    })
    .eq('auth_id', authId);
  if (error) throw error;
}

export async function updateSelectedSkin(skinId: SkinId): Promise<void> {
  const authId = await getAuthId();
  const { error } = await getSupabase()
    .from('profiles')
    .update({ selected_skin: skinId })
    .eq('auth_id', authId);
  if (error) throw error;
}

export async function updateTreeViewMode(mode: TreeViewMode): Promise<void> {
  const authId = await getAuthId();
  const { error } = await getSupabase()
    .from('profiles')
    .update({ tree_view_mode: mode })
    .eq('auth_id', authId);
  if (error) throw error;
}

export async function updateNodePosition(
  nodeId: number,
  posX: number,
  posY: number
): Promise<void> {
  const authId = await getAuthId();
  const { error } = await getSupabase()
    .from('nodes')
    .update({ pos_x: posX, pos_y: posY })
    .eq('id', nodeId)
    .eq('auth_id', authId);
  if (error) throw error;
}

async function findRootParentId(authId: string, macroArea: MacroArea): Promise<number | null> {
  const { data } = await getSupabase()
    .from('nodes')
    .select('id')
    .eq('auth_id', authId)
    .eq('layer', 'root')
    .eq('macro_area', macroArea)
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

export async function getAllNodes(): Promise<SkillNode[]> {
  const authId = await getAuthId();
  const { data, error } = await getSupabase()
    .from('nodes')
    .select('*')
    .eq('auth_id', authId)
    .order('id', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapSupabaseNode);
}

export async function createCustomNode(
  name: string,
  type: NodeType,
  macroArea: MacroArea,
  posX: number,
  posY: number,
  explicitParentId?: number | null,
  options?: { slug?: string | null; guideUrl?: string | null }
): Promise<SkillNode> {
  const authId = await getAuthId();
  const supabase = getSupabase();
  const parentId =
    explicitParentId !== undefined
      ? explicitParentId
      : await findRootParentId(authId, macroArea);

  const { data, error } = await supabase
    .from('nodes')
    .insert({
      auth_id: authId,
      name,
      type,
      layer: 'custom',
      macro_area: macroArea,
      pos_x: posX,
      pos_y: posY,
      parent_id: parentId,
      slug: options?.slug ?? null,
      guide_url: options?.guideUrl ?? null,
      origin_pos_x: posX,
      origin_pos_y: posY,
    })
    .select('*')
    .single();

  if (error || !data) throw new Error('Nodo no creado');

  await supabase.from('history_logs').insert({
    auth_id: authId,
    node_id: data.id,
    action: 'create',
    amount: 0,
  });

  return mapSupabaseNode(data);
}

export async function configureWildcardNode(
  nodeId: number,
  customName: string
): Promise<{ success: boolean; message?: string; node?: SkillNode }> {
  const trimmed = customName.trim();
  if (!trimmed) {
    return { success: false, message: 'Escribe el nombre de tu disciplina' };
  }

  const authId = await getAuthId();
  const supabase = getSupabase();

  const { data: row, error: fetchError } = await supabase
    .from('nodes')
    .select('*')
    .eq('auth_id', authId)
    .eq('id', nodeId)
    .maybeSingle();

  if (fetchError || !row) return { success: false, message: 'Nodo no encontrado' };

  const node = mapSupabaseNode(row);
  if (node.layer !== 'wildcard') {
    return { success: false, message: 'Este nodo ya fue configurado' };
  }

  const { bundleKey, children } = resolveDisciplineChildren(trimmed, node.macroArea);
  const configuredSlug = `${wildcardSlugForArea(node.macroArea)}:${bundleKey}`;

  const { error: updateError } = await supabase
    .from('nodes')
    .update({ name: trimmed, layer: 'custom', slug: configuredSlug })
    .eq('auth_id', authId)
    .eq('id', nodeId);

  if (updateError) return { success: false, message: 'No se pudo actualizar el nodo' };

  let workingNodes = await getAllNodes();
  const parentNode = workingNodes.find((n) => n.id === nodeId)!;
  parentNode.name = trimmed;
  parentNode.layer = 'custom';
  parentNode.slug = configuredSlug;

  for (const child of children) {
    const existing = workingNodes.find((n) => n.slug === child.slug && n.parentId === nodeId);
    if (existing?.layer === 'locked') {
      await supabase
        .from('nodes')
        .update({ name: child.name, type: child.type, layer: 'custom' })
        .eq('auth_id', authId)
        .eq('id', existing.id);
      workingNodes = await getAllNodes();
      continue;
    }
    if (existing) continue;

    const placement = resolveSubSkillPlacement(workingNodes, parentNode);
    const { data: created, error: insertError } = await supabase
      .from('nodes')
      .insert({
        auth_id: authId,
        name: child.name,
        type: child.type,
        layer: 'custom',
        macro_area: node.macroArea,
        pos_x: placement.posX,
        pos_y: placement.posY,
        parent_id: nodeId,
        slug: child.slug,
        origin_pos_x: placement.posX,
        origin_pos_y: placement.posY,
      })
      .select('*')
      .single();

    if (!insertError && created) {
      await supabase.from('history_logs').insert({
        auth_id: authId,
        node_id: created.id,
        action: 'create',
        amount: 0,
      });
      workingNodes = [...workingNodes, mapSupabaseNode(created)];
    }
  }

  await supabase.from('history_logs').insert({
    auth_id: authId,
    node_id: nodeId,
    action: 'create',
    amount: 0,
  });

  const { data: updated } = await supabase
    .from('nodes')
    .select('*')
    .eq('auth_id', authId)
    .eq('id', nodeId)
    .single();

  return { success: true, node: updated ? mapSupabaseNode(updated) : undefined };
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
  const authId = await getAuthId();
  const supabase = getSupabase();

  const { data: row, error: fetchError } = await supabase
    .from('nodes')
    .select('*')
    .eq('auth_id', authId)
    .eq('id', nodeId)
    .maybeSingle();

  if (fetchError || !row) {
    return { success: false, message: 'Nodo no encontrado' };
  }

  const node = mapSupabaseNode(row);
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
    const origin = resolveShadowOriginPosition(target, allNodes);
    const storedOriginX = target.originPosX ?? origin.posX;
    const storedOriginY = target.originPosY ?? origin.posY;

    const { error: updateError } = await supabase
      .from('nodes')
      .update({
        layer: 'dormant',
        xp: 0,
        level: 1,
        last_practice_at: null,
        weekly_xp_sessions: 0,
        week_start_at: null,
        pos_x: origin.posX,
        pos_y: origin.posY,
        origin_pos_x: storedOriginX,
        origin_pos_y: storedOriginY,
      })
      .eq('auth_id', authId)
      .eq('id', id);

    if (updateError) throw updateError;

    await supabase.from('history_logs').insert({
      auth_id: authId,
      node_id: id,
      action: 'banish',
      amount: 0,
    });
  }

  return { success: true };
}

/** Borrado lógico — oculta del mapa preservando XP, nivel y posición. */
export async function softDeleteNode(
  nodeId: number
): Promise<{ success: boolean; message?: string }> {
  const authId = await getAuthId();
  const supabase = getSupabase();

  const { data: row, error: fetchError } = await supabase
    .from('nodes')
    .select('*')
    .eq('auth_id', authId)
    .eq('id', nodeId)
    .maybeSingle();

  if (fetchError || !row) {
    return { success: false, message: 'Nodo no encontrado' };
  }

  const node = mapSupabaseNode(row);
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
    const { error: updateError } = await supabase
      .from('nodes')
      .update({ is_deleted: true })
      .eq('auth_id', authId)
      .eq('id', id);

    if (updateError) throw updateError;

    await supabase.from('history_logs').insert({
      auth_id: authId,
      node_id: id,
      action: 'banish',
      amount: 0,
    });
  }

  return { success: true };
}

export async function restoreDeletedNode(
  nodeId: number
): Promise<{ success: boolean; message?: string; node?: SkillNode }> {
  const authId = await getAuthId();
  const supabase = getSupabase();

  const { data: row, error } = await supabase
    .from('nodes')
    .select('*')
    .eq('auth_id', authId)
    .eq('id', nodeId)
    .maybeSingle();

  if (error || !row) return { success: false, message: 'Nodo no encontrado' };

  const node = mapSupabaseNode(row);
  if (!node.isDeleted) {
    return { success: false, message: 'Este nodo ya está visible en el mapa' };
  }

  const { data: updated, error: updateError } = await supabase
    .from('nodes')
    .update({ is_deleted: false })
    .eq('auth_id', authId)
    .eq('id', nodeId)
    .select('*')
    .single();

  if (updateError || !updated) {
    return { success: false, message: 'Nodo no restaurado' };
  }

  await supabase.from('history_logs').insert({
    auth_id: authId,
    node_id: nodeId,
    action: 'reactivate',
    amount: 0,
  });

  return { success: true, node: mapSupabaseNode(updated) };
}

/** @deprecated Usar banishNodeToUnderworld */
export const deleteCustomNode = banishNodeToUnderworld;

export async function reactivateNode(
  nodeId: number
): Promise<{ success: boolean; message?: string; node?: SkillNode }> {
  const authId = await getAuthId();
  const supabase = getSupabase();

  const { data: row, error } = await supabase
    .from('nodes')
    .select('*')
    .eq('auth_id', authId)
    .eq('id', nodeId)
    .maybeSingle();

  if (error || !row) return { success: false, message: 'Nodo no encontrado' };

  const node = mapSupabaseNode(row);
  if (node.layer !== 'dormant') {
    return { success: false, message: 'Solo se pueden reactivar nodos del inframundo' };
  }

  const { data: updated, error: updateError } = await supabase
    .from('nodes')
    .update({
      layer: 'custom',
      xp: 0,
      level: 1,
      last_practice_at: null,
      weekly_xp_sessions: 0,
      week_start_at: null,
    })
    .eq('auth_id', authId)
    .eq('id', nodeId)
    .select('*')
    .single();

  if (updateError || !updated) {
    return { success: false, message: 'Nodo no reactivado' };
  }

  await supabase.from('history_logs').insert({
    auth_id: authId,
    node_id: nodeId,
    action: 'reactivate',
    amount: 0,
  });

  return { success: true, node: mapSupabaseNode(updated) };
}

export async function addXpToNode(
  nodeId: number,
  baseXp: number,
  user: User
): Promise<{ success: boolean; message?: string; node?: SkillNode }> {
  const authId = await getAuthId();
  const supabase = getSupabase();

  const { data: row, error } = await supabase
    .from('nodes')
    .select('*')
    .eq('id', nodeId)
    .eq('auth_id', authId)
    .single();

  if (error || !row) return { success: false, message: 'Nodo no encontrado' };

  const node = mapSupabaseNode(row);
  const now = new Date();

  if (node.type === 'physical') {
    let sessions = node.weeklyXpSessions;
    if (!isSameWeek(node.weekStartAt, now)) sessions = 0;

    if (sessions >= DECAY_CONFIG.physical.maxWeeklySessions) {
      return {
        success: false,
        message: 'Límite semanal alcanzado (4 sesiones). Descansa para evitar lesiones.',
      };
    }

    const weekStart = isSameWeek(node.weekStartAt, now) ? node.weekStartAt! : getWeekStart(now);
    const xpGain = baseXp * user.xpGainModifier;
    const newXp = node.xp + xpGain;

    await supabase
      .from('nodes')
      .update({
        xp: newXp,
        level: levelFromXp(newXp),
        last_practice_at: now.toISOString(),
        weekly_xp_sessions: sessions + 1,
        week_start_at: weekStart,
      })
      .eq('id', nodeId);

    await supabase.from('history_logs').insert({
      auth_id: authId,
      node_id: nodeId,
      action: 'xp_gain',
      amount: xpGain,
    });
  } else {
    const xpGain = baseXp * user.xpGainModifier;
    const newXp = node.xp + xpGain;

    await supabase
      .from('nodes')
      .update({
        xp: newXp,
        level: levelFromXp(newXp),
        last_practice_at: now.toISOString(),
      })
      .eq('id', nodeId);

    await supabase.from('history_logs').insert({
      auth_id: authId,
      node_id: nodeId,
      action: 'xp_gain',
      amount: xpGain,
    });
  }

  const { data: updated } = await supabase
    .from('nodes')
    .select('*')
    .eq('id', nodeId)
    .single();

  return { success: true, node: mapSupabaseNode(updated!) };
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
    areas[node.macroArea] += node.level;
  }

  return areas;
}

export async function getRecentHistory(limit = 20) {
  const authId = await getAuthId();
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('history_logs')
    .select('*')
    .eq('auth_id', authId)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) throw error;

  const nodes = await getAllNodes();
  const names = new Map(nodes.map((n) => [n.id, n.name]));

  return (data ?? []).map((row) => ({
    ...row,
    node_name: names.get(row.node_id as number) ?? '',
  }));
}
