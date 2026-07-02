import { DISCIPLINE_CATALOG } from '@/src/data/disciplineCatalog';
import { GUIDE_SUGGESTIONS } from '@/src/data/guideSuggestions';
import { buildMentalEmotionalGalaxyCatalogSeeds } from '@/src/data/mentalEmotionalGalaxyCatalog';
import { buildPhysicalGalaxyCatalogSeeds } from '@/src/data/physicalGalaxyCatalog';
import { buildProductiveGalaxyCatalogSeeds } from '@/src/data/productiveGalaxyCatalog';
import {
  NEN_MOTHER_ROOTS,
  NEN_MOTHER_SLUG_BY_ID,
  NEN_MOTHER_VECTOR_RAD,
  NEN_ROOT_SLUG_BY_MACRO,
  getNenMotherRootPosition,
  type NenMotherId,
} from '@/src/config/nenMotherRoots';
import { MacroArea, NodeColorRole, NodeType } from '@/src/types';
import {
  CatalogLayoutPoint,
  catalogGenerationPosition,
  layoutCatalogChild,
  layoutCatalogHubOrGuide,
  toCatalogLayoutPoint,
} from '@/src/utils/catalogLayout';
import { assignStableSlots } from '@/src/utils/catalogLayoutPolicy';
import { catalogChildPositionFromParent } from '@/src/utils/mapGeometry';

export interface CatalogNodeSeed {
  slug: string;
  name: string;
  type: NodeType;
  macroArea: MacroArea;
  parentSlug: string;
  generation?: number;
  posX: number;
  posY: number;
  /** Enlace YouTube persistido en `guide_url`. */
  youtubeUrl?: string | null;
  /** @deprecated Usar youtubeUrl */
  guideUrl?: string | null;
  colorRole?: NodeColorRole | null;
}

const ROOT_SLUG_BY_AREA: Record<MacroArea, string> = NEN_ROOT_SLUG_BY_MACRO;

const PRODUCTIVE_MOTHER_BY_KEY: Record<string, keyof typeof NEN_MOTHER_SLUG_BY_ID> = {
  coding: 'manipulation',
  writing: 'emission',
  design: 'emission',
};

const INTELLECTUAL_ROOT_SLUG = NEN_MOTHER_SLUG_BY_ID.specialization;

function resolveBundleMotherId(macroArea: MacroArea, bundleKey: string): NenMotherId {
  if (macroArea === 'productive') {
    return PRODUCTIVE_MOTHER_BY_KEY[bundleKey] ?? 'manipulation';
  }
  if (macroArea === 'intellectual' || macroArea === 'mental_emotional') {
    return 'specialization';
  }
  return 'intensification';
}

function layoutHubFromNenMother(
  motherId: NenMotherId,
  slotIndex: number,
  siblingCount: number
) {
  const polar = catalogGenerationPosition(
    NEN_MOTHER_VECTOR_RAD[motherId],
    0,
    slotIndex,
    siblingCount
  );
  return {
    hubAngle: Math.atan2(polar.logY, polar.logX),
    ...polar,
  };
}

interface HubDraftEntry {
  slug: string;
  name: string;
  type: NodeType;
  macroArea: MacroArea;
  parentSlug: string;
  motherId: NenMotherId;
  youtubeUrl?: string | null;
}

const OTHER_MACRO_AREAS: MacroArea[] = ['intellectual'];

interface SeedDraft {
  slug: string;
  name: string;
  type: NodeType;
  macroArea: MacroArea;
  parentSlug: string;
  youtubeUrl?: string | null;
  colorRole?: NodeColorRole | null;
  layoutPoint: CatalogLayoutPoint;
}

function orderSeedsByDependency(seeds: CatalogNodeSeed[]): CatalogNodeSeed[] {
  const ordered: CatalogNodeSeed[] = [];
  const pending = [...seeds];
  const resolved = new Set<string>([
    ...Object.values(NEN_MOTHER_SLUG_BY_ID),
    ...Object.values(ROOT_SLUG_BY_AREA),
  ]);

  while (pending.length > 0) {
    const nextIndex = pending.findIndex((seed) => resolved.has(seed.parentSlug));
    if (nextIndex < 0) break;
    const [next] = pending.splice(nextIndex, 1);
    ordered.push(next);
    resolved.add(next.slug);
  }

  return ordered.length > 0 ? [...ordered, ...pending] : seeds;
}

function resolveGuideMotherId(macroArea: MacroArea, guideSlug: string): NenMotherId | null {
  if (guideSlug === 'guide_pomodoro') return 'materialization';
  if (macroArea === 'intellectual') return 'specialization';
  if (macroArea === 'productive') return 'manipulation';
  return null;
}

function buildLegacyMacroAreaSeeds(macroArea: MacroArea): CatalogNodeSeed[] {
  const drafts: SeedDraft[] = [];
  const bundles = DISCIPLINE_CATALOG[macroArea];
  const guides = GUIDE_SUGGESTIONS[macroArea];
  const hubEntries: HubDraftEntry[] = [];

  bundles.forEach((bundle) => {
    const hubSlug = `discipline_${macroArea}_${bundle.key}`;
    const rootSlug =
      macroArea === 'productive'
        ? NEN_MOTHER_SLUG_BY_ID[PRODUCTIVE_MOTHER_BY_KEY[bundle.key] ?? 'manipulation']
        : macroArea === 'intellectual'
          ? INTELLECTUAL_ROOT_SLUG
          : ROOT_SLUG_BY_AREA[macroArea];
    const motherId =
      macroArea === 'productive' || macroArea === 'intellectual'
        ? resolveBundleMotherId(macroArea, bundle.key)
        : 'intensification';

    hubEntries.push({
      slug: hubSlug,
      name: bundle.displayName,
      type: macroArea === 'physical' ? 'physical' : 'intellectual',
      macroArea,
      parentSlug: rootSlug,
      motherId,
    });
  });

  guides.forEach((guide) => {
    const guideMotherId = resolveGuideMotherId(macroArea, guide.slug);
    const rootSlug = guideMotherId
      ? NEN_MOTHER_SLUG_BY_ID[guideMotherId]
      : macroArea === 'intellectual' || macroArea === 'mental_emotional'
        ? INTELLECTUAL_ROOT_SLUG
        : ROOT_SLUG_BY_AREA[macroArea];

    hubEntries.push({
      slug: guide.slug,
      name: guide.name,
      type: guide.type,
      macroArea,
      parentSlug: rootSlug,
      motherId: guideMotherId ?? 'specialization',
      youtubeUrl: guide.guideUrl ?? null,
    });
  });

  const slottedHubs = assignStableSlots(hubEntries, (entry) => entry.motherId);
  const hubLayoutBySlug = new Map<string, ReturnType<typeof layoutHubFromNenMother>>();

  for (const hub of slottedHubs) {
    const layout =
      macroArea === 'productive' || macroArea === 'intellectual'
        ? layoutHubFromNenMother(hub.motherId, hub.slotIndex, hub.siblingCount)
        : layoutCatalogHubOrGuide(macroArea, hub.slotIndex, slottedHubs.length);
    hubLayoutBySlug.set(hub.slug, layout);
  }

  bundles.forEach((bundle) => {
    const hubSlug = `discipline_${macroArea}_${bundle.key}`;
    const hubLayout = hubLayoutBySlug.get(hubSlug)!;
    const rootSlug =
      macroArea === 'productive'
        ? NEN_MOTHER_SLUG_BY_ID[PRODUCTIVE_MOTHER_BY_KEY[bundle.key] ?? 'manipulation']
        : macroArea === 'intellectual'
          ? INTELLECTUAL_ROOT_SLUG
          : ROOT_SLUG_BY_AREA[macroArea];

    drafts.push({
      slug: hubSlug,
      name: bundle.displayName,
      type: macroArea === 'physical' ? 'physical' : 'intellectual',
      macroArea,
      parentSlug: rootSlug,
      layoutPoint: toCatalogLayoutPoint(
        hubSlug,
        macroArea,
        hubLayout.logX,
        hubLayout.logY,
        hubLayout.posX,
        hubLayout.posY
      ),
    });

    bundle.children.forEach((child, childIdx) => {
      const childLayout = layoutCatalogChild(
        hubLayout.hubAngle,
        macroArea,
        childIdx,
        bundle.children.length
      );

      drafts.push({
        slug: child.slug,
        name: child.name,
        type: child.type,
        macroArea,
        parentSlug: hubSlug,
        layoutPoint: toCatalogLayoutPoint(
          child.slug,
          macroArea,
          childLayout.logX,
          childLayout.logY,
          childLayout.posX,
          childLayout.posY
        ),
      });
    });
  });

  guides.forEach((guide) => {
    const guideLayout = hubLayoutBySlug.get(guide.slug)!;
    const guideMotherId = resolveGuideMotherId(macroArea, guide.slug);
    const rootSlug = guideMotherId
      ? NEN_MOTHER_SLUG_BY_ID[guideMotherId]
      : macroArea === 'intellectual' || macroArea === 'mental_emotional'
        ? INTELLECTUAL_ROOT_SLUG
        : ROOT_SLUG_BY_AREA[macroArea];

    drafts.push({
      slug: guide.slug,
      name: guide.name,
      type: guide.type,
      macroArea,
      parentSlug: rootSlug,
      youtubeUrl: guide.guideUrl ?? null,
      layoutPoint: toCatalogLayoutPoint(
        guide.slug,
        macroArea,
        guideLayout.logX,
        guideLayout.logY,
        guideLayout.posX,
        guideLayout.posY
      ),
    });
  });

  return drafts.map((draft) => {
    const youtubeUrl = draft.youtubeUrl ?? null;
    return {
      slug: draft.slug,
      name: draft.name,
      type: draft.type,
      macroArea: draft.macroArea,
      parentSlug: draft.parentSlug,
      posX: draft.layoutPoint.posX,
      posY: draft.layoutPoint.posY,
      youtubeUrl,
      guideUrl: youtubeUrl,
      colorRole: draft.colorRole ?? 'standard',
    };
  });
}

function inferCatalogGeneration(seed: CatalogNodeSeed): number {
  if (seed.generation != null) return seed.generation;
  if (seed.slug.startsWith('disc_') && !seed.slug.startsWith('discipline_')) return 1;
  if (seed.slug.startsWith('discipline_')) return 0;
  return 1;
}

interface LayoutAnchor {
  logX: number;
  logY: number;
  posX: number;
  posY: number;
}

/** Posiciones deterministas: vector angular del padre + 250px por generación. */
function computeCatalogPositionsByParentChain(
  seeds: CatalogNodeSeed[]
): Map<string, { posX: number; posY: number }> {
  const ordered = orderSeedsByDependency(seeds);
  const layoutBySlug = new Map<string, LayoutAnchor>();

  for (const root of NEN_MOTHER_ROOTS) {
    const pos = getNenMotherRootPosition(root.id);
    layoutBySlug.set(root.slug, pos);
  }

  const siblingsByParentGen = new Map<string, CatalogNodeSeed[]>();
  for (const seed of ordered) {
    const gen = inferCatalogGeneration(seed);
    const key = `${seed.parentSlug}:${gen}`;
    const group = siblingsByParentGen.get(key) ?? [];
    group.push(seed);
    siblingsByParentGen.set(key, group);
  }

  for (const [, group] of siblingsByParentGen) {
    group.sort((a, b) => a.slug.localeCompare(b.slug));
  }

  for (const seed of ordered) {
    const parent = layoutBySlug.get(seed.parentSlug);
    if (!parent) continue;

    const generation = inferCatalogGeneration(seed);
    const sibKey = `${seed.parentSlug}:${generation}`;
    const siblings = siblingsByParentGen.get(sibKey) ?? [seed];
    const slotIndex = Math.max(0, siblings.findIndex((s) => s.slug === seed.slug));
    const placement = catalogChildPositionFromParent(
      parent.logX,
      parent.logY,
      generation,
      slotIndex,
      siblings.length
    );
    layoutBySlug.set(seed.slug, placement);
  }

  const positions = new Map<string, { posX: number; posY: number }>();
  for (const seed of seeds) {
    const layout = layoutBySlug.get(seed.slug);
    if (layout) positions.set(seed.slug, { posX: layout.posX, posY: layout.posY });
  }
  return positions;
}

function applySectorPositionsToCatalogSeeds(seeds: CatalogNodeSeed[]): CatalogNodeSeed[] {
  const positions = computeCatalogPositionsByParentChain(seeds);

  return seeds.map((seed) => {
    const pos = positions.get(seed.slug);
    if (!pos) return seed;
    return { ...seed, posX: pos.posX, posY: pos.posY };
  });
}

/** Genera todos los nodos bloqueados del catálogo con posiciones sectoriales deterministas. */
export function buildSkillCatalogSeeds(): CatalogNodeSeed[] {
  const physicalGalaxy = buildPhysicalGalaxyCatalogSeeds();
  const mentalGalaxy = buildMentalEmotionalGalaxyCatalogSeeds();
  const productiveGalaxy = buildProductiveGalaxyCatalogSeeds();
  const otherAreas = OTHER_MACRO_AREAS.flatMap((macroArea) =>
    buildLegacyMacroAreaSeeds(macroArea)
  );

  const ordered = orderSeedsByDependency([
    ...physicalGalaxy,
    ...mentalGalaxy,
    ...productiveGalaxy,
    ...otherAreas,
  ]);
  return applySectorPositionsToCatalogSeeds(ordered);
}

export { ROOT_SLUG_BY_AREA };
