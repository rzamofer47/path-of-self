import { resolveNenAxisId } from '@/src/config/nenConfig';
import { SkillNode, User } from '@/src/types';
import type { NodeColorRole } from '@/src/types';
import { isDailyVerifiedToday } from '@/src/utils/dailyVerification';
import { isRootNode } from '@/src/utils/nodeMenuPolicy';
import {
  getMacroAreaPalette,
  getNodeOrbPalette,
  type NodeOrbPalette,
} from '@/src/utils/nodeColors';
import { isWildcardNode } from '@/src/utils/wildcardNodes';

const MS_DAY = 24 * 60 * 60 * 1000;

export type { NodeColorRole } from '@/src/types';
export type RoutineIntensity = 'active' | 'paused';

export interface NodeVisualIntensity {
  colorRole: NodeColorRole;
  routineState: RoutineIntensity;
  palette: NodeOrbPalette;
}

function routineWindowMs(user: User | null): number {
  switch (user?.practiceFrequency) {
    case 'daily':
      return 2 * MS_DAY;
    case 'weekly':
      return 7 * MS_DAY;
    case 'occasional':
      return 14 * MS_DAY;
    default:
      return 7 * MS_DAY;
  }
}

function practicedWithin(node: SkillNode, windowMs: number, now: Date): boolean {
  if (!node.lastPracticeAt) return false;
  return now.getTime() - new Date(node.lastPracticeAt).getTime() <= windowMs;
}

function verifiedWithin(node: SkillNode, windowMs: number, now: Date): boolean {
  if (!node.dailyVerifiedAt) return false;
  const verified = new Date(node.dailyVerifiedAt);
  if (Number.isNaN(verified.getTime())) return false;
  return now.getTime() - verified.getTime() <= windowMs;
}

/** Práctica registrada o check diario dentro de la ventana de rutina. */
function engagedWithin(node: SkillNode, windowMs: number, now: Date): boolean {
  return practicedWithin(node, windowMs, now) || verifiedWithin(node, windowMs, now);
}

/** Check diario de hoy — enciende el nodo de inmediato en la rutina actual. */
function verifiedTodayInRoutine(node: SkillNode, now: Date): boolean {
  return isDailyVerifiedToday(node, now);
}

export function getNodeColorRole(node: SkillNode): NodeColorRole {
  if (isWildcardNode(node)) return 'wildcard';
  if (node.colorRole === 'critical' || node.colorRole === 'shared' || node.colorRole === 'standard') {
    return node.colorRole;
  }
  return isRootNode(node) ? 'critical' : 'shared';
}

/** ¿El nodo está activo en la rutina del usuario (brillo pleno)? */
export function isNodeActiveInRoutine(
  node: SkillNode,
  nodes: SkillNode[],
  user: User | null,
  now: Date = new Date()
): boolean {
  if (node.layer === 'dormant' || node.id < 0 || isWildcardNode(node)) return false;

  const windowMs = routineWindowMs(user);

  if (node.layer === 'locked') {
    return verifiedTodayInRoutine(node, now) || engagedWithin(node, windowMs, now);
  }

  if (isRootNode(node)) {
    if (engagedWithin(node, windowMs, now) || verifiedTodayInRoutine(node, now)) return true;
    const axisId = resolveNenAxisId(node, nodes);
    if (!axisId) return false;
    return nodes.some(
      (n) =>
        (n.layer === 'custom' || n.layer === 'locked') &&
        resolveNenAxisId(n, nodes) === axisId &&
        (engagedWithin(n, windowMs, now) || verifiedTodayInRoutine(n, now))
    );
  }

  if (node.layer !== 'custom') {
    return verifiedTodayInRoutine(node, now);
  }

  if (engagedWithin(node, windowMs, now) || verifiedTodayInRoutine(node, now)) return true;

  const nodeAxis = resolveNenAxisId(node, nodes);
  const parent =
    node.parentId != null
      ? nodes.find((n) => n.id === node.parentId) ?? null
      : nodeAxis != null
        ? nodes.find(
            (n) => isRootNode(n) && resolveNenAxisId(n, nodes) === nodeAxis
          ) ?? null
        : null;

  if (parent && isRootNode(parent) && engagedWithin(parent, windowMs, now)) {
    return node.xp > 0;
  }

  return false;
}

export function getNodeVisualIntensity(
  node: SkillNode,
  nodes: SkillNode[],
  user: User | null,
  now: Date = new Date()
): NodeVisualIntensity {
  const colorRole = getNodeColorRole(node);
  const routineState: RoutineIntensity =
    colorRole === 'wildcard'
      ? 'paused'
      : isNodeActiveInRoutine(node, nodes, user, now)
        ? 'active'
        : 'paused';

  const active = routineState === 'active';
  const palette =
    colorRole === 'wildcard'
      ? getNodeOrbPalette(node, nodes, { secondary: '', accent: '' }, active)
      : isRootNode(node)
        ? getNodeOrbPalette(node, nodes, { secondary: '', accent: '' }, active)
        : getMacroAreaPalette(node.macroArea, active);

  return { colorRole, routineState, palette };
}

/** Paleta tenue del sector (p. ej. catálogo bloqueado). */
export function getRolePalette(node: SkillNode): NodeOrbPalette {
  if (isWildcardNode(node)) {
    return getNodeOrbPalette(node, [], { secondary: '', accent: '' }, false);
  }
  const role = getNodeColorRole(node);
  if (role === 'critical') {
    return getMacroAreaPalette('physical', false);
  }
  return getMacroAreaPalette(node.macroArea, false);
}
