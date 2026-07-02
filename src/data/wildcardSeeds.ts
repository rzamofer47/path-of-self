import { MacroArea, NodeType } from '@/src/types';
import { WILDCARD_PLACEHOLDER_NAME } from '@/src/data/disciplineCatalog';
import {
  NEN_MOTHER_BY_SLUG,
  NEN_MOTHER_VECTOR_RAD,
  NEN_ROOT_SLUG_BY_MACRO,
} from '@/src/config/nenMotherRoots';
import { wildcardSlugForArea } from '@/src/utils/wildcardNodes';
import { ORBIT_2_RADIUS, ROOT_ORBIT_RADIUS, logicalToPos } from '@/src/utils/mapGeometry';
import { getOrbitParent } from '@/src/utils/polarLayout';

export interface WildcardSeed {
  slug: string;
  name: string;
  type: NodeType;
  macroArea: MacroArea;
}

/** Órbita intermedia entre raíz y catálogo (evita solaparse con hubs en anillo 2). */
export const WILDCARD_ORBIT_RADIUS = (ROOT_ORBIT_RADIUS + ORBIT_2_RADIUS) / 2;

export const WILDCARD_SEEDS: readonly WildcardSeed[] = [
  {
    slug: wildcardSlugForArea('physical'),
    name: WILDCARD_PLACEHOLDER_NAME,
    type: 'physical',
    macroArea: 'physical',
  },
  {
    slug: wildcardSlugForArea('intellectual'),
    name: WILDCARD_PLACEHOLDER_NAME,
    type: 'intellectual',
    macroArea: 'intellectual',
  },
  {
    slug: wildcardSlugForArea('mental_emotional'),
    name: WILDCARD_PLACEHOLDER_NAME,
    type: 'intellectual',
    macroArea: 'mental_emotional',
  },
  {
    slug: wildcardSlugForArea('productive'),
    name: WILDCARD_PLACEHOLDER_NAME,
    type: 'intellectual',
    macroArea: 'productive',
  },
] as const;

export function resolveWildcardSeedPlacement(
  nodes: import('@/src/types').SkillNode[],
  macroArea: MacroArea
) {
  const parent = getOrbitParent(nodes, macroArea);
  if (!parent) {
    return { posX: 0, posY: 0, parentId: null as number | null };
  }

  const rootSlug = NEN_ROOT_SLUG_BY_MACRO[macroArea];
  const motherDef = NEN_MOTHER_BY_SLUG[rootSlug];
  const angle = motherDef
    ? NEN_MOTHER_VECTOR_RAD[motherDef.id]
    : NEN_MOTHER_VECTOR_RAD.intensification;
  const logX = WILDCARD_ORBIT_RADIUS * Math.cos(angle);
  const logY = WILDCARD_ORBIT_RADIUS * Math.sin(angle);
  const pos = logicalToPos(logX, logY);

  return {
    posX: pos.posX,
    posY: pos.posY,
    parentId: parent.id,
  };
}
