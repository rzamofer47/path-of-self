import { useMemo } from 'react';

import { lookupCompoundTitle } from '@/src/data/titleMatrix';
import { getAreaLevels } from '@/src/database/queryEngine';
import { MacroArea, SkillNode, User, UserStatus } from '@/src/types';
import { computeDecayRatio } from '@/src/utils/decayRatio';

const TITLE_MATRIX: Record<string, string> = {
  'physical+intellectual': 'Maestro de Armas',
  'physical+mental_emotional': 'Guerrero Zen',
  'intellectual+productive': 'Alquimista Moderno',
  'physical+productive': 'Atleta Estratega',
  'intellectual+mental_emotional': 'Sabio Interior',
  'mental_emotional+productive': 'Arquitecto del Equilibrio',
  'physical+physical': 'Campeón Atlético',
  'intellectual+intellectual': 'Erudito Supremo',
  'mental_emotional+mental_emotional': 'Monje Moderno',
  'productive+productive': 'Maestro de Productividad',
};

const AREA_LABELS: Record<MacroArea, string> = {
  physical: 'Física',
  intellectual: 'Intelectual',
  mental_emotional: 'Mental/Emocional',
  productive: 'Productiva',
};

const ALL_AREAS: MacroArea[] = [
  'physical',
  'intellectual',
  'mental_emotional',
  'productive',
];

const MS_WEEK = 7 * 24 * 60 * 60 * 1000;

function getTitleKey(a: MacroArea, b: MacroArea): string {
  const sorted = [a, b].sort();
  return `${sorted[0]}+${sorted[1]}`;
}

function titleForAreas(a: MacroArea, b: MacroArea): string {
  return TITLE_MATRIX[getTitleKey(a, b)] ?? 'Aventurero en Camino';
}

function getTopTwoAreas(areaLevels: Record<MacroArea, number>): MacroArea[] {
  return (Object.entries(areaLevels) as [MacroArea, number][])
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([area]) => area);
}

function averageAreaDecay(
  nodes: SkillNode[],
  user: User,
  area: MacroArea,
  now: Date
): number {
  const custom = nodes.filter((n) => n.layer === 'custom' && n.macroArea === area);
  if (custom.length === 0) return 1;
  return custom.reduce((s, n) => s + computeDecayRatio(n, user, now), 0) / custom.length;
}

function isAreaRising(nodes: SkillNode[], area: MacroArea, now: Date): boolean {
  const custom = nodes.filter((n) => n.layer === 'custom' && n.macroArea === area);
  if (custom.length === 0) return false;

  const recentlyPracticed = custom.some((n) => {
    if (!n.lastPracticeAt) return false;
    return now.getTime() - new Date(n.lastPracticeAt).getTime() <= MS_WEEK;
  });

  const avgLevel = custom.reduce((s, n) => s + n.level, 0) / custom.length;
  return recentlyPracticed && avgLevel >= 1.5;
}

function resolveCompoundTitle(
  nodes: SkillNode[],
  user: User,
  dominantAreas: MacroArea[],
  now: Date
): string | null {
  const declining = ALL_AREAS.filter((a) => averageAreaDecay(nodes, user, a, now) < 0.4);
  const rising = ALL_AREAS.filter((a) => isAreaRising(nodes, a, now));

  if (declining.length === 0 || rising.length === 0) return null;

  const decayArea = declining.find((a) => !dominantAreas.includes(a)) ?? declining[0];
  const riseArea = rising.find((a) => a !== decayArea) ?? rising[0];

  if (decayArea === riseArea) return null;
  return lookupCompoundTitle(decayArea, riseArea);
}

function computeLegacyTags(
  areaLevels: Record<MacroArea, number>,
  nodes: SkillNode[]
): string[] {
  const tags: string[] = [];
  const physicalNodes = nodes.filter((n) => n.macroArea === 'physical');
  const intellectualNodes = nodes.filter((n) => n.macroArea === 'intellectual');

  const physicalAvg =
    physicalNodes.length > 0
      ? physicalNodes.reduce((s, n) => s + n.xp, 0) / physicalNodes.length
      : 0;
  const intellectualAvg =
    intellectualNodes.length > 0
      ? intellectualNodes.reduce((s, n) => s + n.xp, 0) / intellectualNodes.length
      : 0;

  const physicalLevel = areaLevels.physical;
  const intellectualLevel = areaLevels.intellectual;

  if (physicalLevel < intellectualLevel && physicalAvg < intellectualAvg * 0.5) {
    tags.push('Oxidado');
  }
  if (physicalLevel < 3 && intellectualLevel >= 5) {
    tags.push('Fuera de Forma');
  }

  return tags;
}

function computeLegacyTitle(
  areaLevels: Record<MacroArea, number>,
  legacyTags: string[],
  dominantAreas: MacroArea[]
): string | null {
  if (legacyTags.length === 0) return null;
  if (dominantAreas[0] === 'physical') return null;

  const sorted = (Object.entries(areaLevels) as [MacroArea, number][])
    .sort(([, a], [, b]) => b - a)
    .map(([area]) => area);

  const formerPartner = sorted.find((a) => a !== 'physical' && a !== dominantAreas[0]) ?? 'intellectual';
  return titleForAreas('physical', formerPartner);
}

export function computeUserStatus(
  areaLevels: Record<MacroArea, number>,
  nodes: SkillNode[],
  user?: User | null,
  now: Date = new Date()
): UserStatus {
  const dominantAreas = getTopTwoAreas(areaLevels);
  let activeTitle = titleForAreas(dominantAreas[0], dominantAreas[1]);

  if (user) {
    const compound = resolveCompoundTitle(nodes, user, dominantAreas, now);
    if (compound) activeTitle = compound;
  }

  const legacyTags = computeLegacyTags(areaLevels, nodes);
  const legacyTitle = computeLegacyTitle(areaLevels, legacyTags, dominantAreas);

  return { activeTitle, legacyTitle, legacyTags, dominantAreas, areaLevels };
}

export function useStatusEngine(
  areaLevels: Record<MacroArea, number> | null,
  nodes: SkillNode[],
  user?: User | null
): UserStatus | null {
  return useMemo(() => {
    if (!areaLevels) return null;
    return computeUserStatus(areaLevels, nodes, user);
  }, [areaLevels, nodes, user]);
}

export { AREA_LABELS };

export async function fetchAreaLevels(): Promise<Record<MacroArea, number>> {
  return getAreaLevels();
}
