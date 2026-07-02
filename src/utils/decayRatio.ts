import { SkillNode, User } from '@/src/types';
import { isRootLayer } from '@/src/utils/nodeColors';
import { computeVisualFreshnessRatio } from '@/src/utils/visualDecay';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 1 = aura vibrante, 0 = cenizo. Solo visual — no afecta XP ni nivel. */
export function computeDecayRatio(
  node: SkillNode,
  _user: User,
  now: Date = new Date()
): number {
  if (isRootLayer(node)) return 1;
  return computeVisualFreshnessRatio(node, now);
}

export function isRecentlyPracticed(
  lastPracticeAt: string | null,
  now: Date = new Date(),
  withinMs = MS_PER_DAY
): boolean {
  if (!lastPracticeAt) return false;
  return now.getTime() - new Date(lastPracticeAt).getTime() <= withinMs;
}

export function averageDecayRatioForArea(
  nodes: SkillNode[],
  user: User,
  macroArea: SkillNode['macroArea'],
  now: Date = new Date()
): number {
  const custom = nodes.filter((n) => n.layer === 'custom' && n.macroArea === macroArea);
  if (custom.length === 0) return 0.35;

  const sum = custom.reduce((acc, n) => acc + computeDecayRatio(n, user, now), 0);
  return sum / custom.length;
}

export { getNodeGraceMs } from '@/src/utils/forgettingEngine';
