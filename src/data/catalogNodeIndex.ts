import { PROGRESION_CONFIG } from '@/src/config/progressionConfig';

import { MANIPULATION_GALAXY_NODES } from '@/src/data/manipulationGalaxyCatalog';

import { MENTAL_GALAXY_NODES } from '@/src/data/mentalEmotionalGalaxyCatalog';

import { PHYSICAL_GALAXY_NODES } from '@/src/data/physicalGalaxyCatalog';

import { PRODUCTIVE_GALAXY_NODES } from '@/src/data/productiveGalaxyCatalog';

import { TRANSFORMATION_GALAXY_NODES } from '@/src/data/transformationGalaxyCatalog';



export interface CatalogNodeMeta {

  branch: string;

  generation: number;

  colorRole?: string | null;

  prerequisiteSlug?: string | null;

}



const CATALOG_INDEX = new Map<string, CatalogNodeMeta>();



for (const node of [

  ...PHYSICAL_GALAXY_NODES,

  ...TRANSFORMATION_GALAXY_NODES,

  ...MENTAL_GALAXY_NODES,

  ...MANIPULATION_GALAXY_NODES,

  ...PRODUCTIVE_GALAXY_NODES,

]) {

  CATALOG_INDEX.set(node.slug, {

    branch: node.branch,

    generation: node.generation,

    colorRole: node.colorRole ?? null,

    prerequisiteSlug: node.prerequisiteSlug ?? null,

  });

}



export function getCatalogNodeMeta(slug: string | null): CatalogNodeMeta | null {

  if (!slug) return null;

  return CATALOG_INDEX.get(slug) ?? null;

}



export function getGenerationPeerSlugs(slug: string | null): string[] {

  const meta = getCatalogNodeMeta(slug);

  if (!meta || meta.generation <= 0) return [];

  return [...CATALOG_INDEX.entries()]

    .filter(([, entry]) => entry.branch === meta.branch && entry.generation === meta.generation)

    .map(([entrySlug]) => entrySlug);

}



/** Gen 5 hitos críticos del catálogo (progresión lineal). */

export function isCriticalCatalogSlug(slug: string | null): boolean {

  const meta = getCatalogNodeMeta(slug);

  return meta?.generation === 5 && meta.colorRole === 'critical';

}



export const GENERATION_COMPLETE_MIN_LEVEL = 2;



export function isGenerationCompleteForNodes(

  peerSlugs: string[],

  nodesBySlug: Map<string, { level: number; xp: number; lastPracticeAt: string | null }>

): boolean {

  if (peerSlugs.length === 0) return false;

  return peerSlugs.every((slug) => {

    const node = nodesBySlug.get(slug);

    if (!node) return false;

    return node.level >= GENERATION_COMPLETE_MIN_LEVEL || node.xp >= PROGRESION_CONFIG.xpPorNivel;

  });

}

