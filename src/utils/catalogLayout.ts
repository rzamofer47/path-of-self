import { MacroArea } from '@/src/types';

import { enforceGlobalNodeSeparation } from './catalogLayoutPolicy';
import {
  DifficultyTier,
  ORB_SIZE,
  clampAngleToSector,
  catalogGenerationPosition,
  catalogMentalBranchPosition,
  catalogNenMotherBranchPosition,
  evenSectorAngles,
  generationRadiusPx,
  orbitRadiusForTier,
  polarCatalogPosition,
  siblingAnglesForParent,
} from './mapGeometry';

/** Separación mínima entre centros de nodos del catálogo (post-proceso legacy). */
export const CATALOG_NODE_GAP = ORB_SIZE + 48;

/** Hijos en órbitas 3 y 4 (generaciones 2–3 del mapa). */
export const CATALOG_CHILD_TIERS: DifficultyTier[] = [3, 4, 4];

export interface CatalogLayoutPoint {
  slug: string;
  macroArea: MacroArea;
  logX: number;
  logY: number;
  posX: number;
  posY: number;
  preferredRadius: number;
  preferredAngle?: number;
}

export { evenSectorAngles, polarCatalogPosition, siblingAnglesForParent };

export function layoutCatalogHubOrGuide(
  macroArea: MacroArea,
  slotIndex: number,
  slotCount: number
) {
  const angles = evenSectorAngles(macroArea, slotCount);
  const hubAngle = angles[slotIndex] ?? angles[0];
  const radius = orbitRadiusForTier(2);
  return { hubAngle, ...polarCatalogPosition(hubAngle, radius), difficultyTier: 2 as DifficultyTier };
}

export function layoutCatalogChild(
  hubAngle: number,
  macroArea: MacroArea,
  childIndex: number,
  childCount: number
) {
  const tier = CATALOG_CHILD_TIERS[childIndex] ?? 4;
  const generation = tier; // tier 3 ≈ gen 2 (470px), tier 4 ≈ gen 3 (720px)
  const radius = generationRadiusPx(generation, childCount);
  const angles = siblingAnglesForParent(hubAngle, childCount, macroArea);
  const angle = angles[childIndex] ?? hubAngle;
  return { angle, tier, ...polarCatalogPosition(angle, radius) };
}

function snapToPreferredOrbit(
  item: CatalogLayoutPoint,
  macroArea: MacroArea,
  radiusSlack = 28
) {
  const angle = clampAngleToSector(Math.atan2(item.logY, item.logX), macroArea);
  const currentR = Math.hypot(item.logX, item.logY);
  const radius = Math.min(
    Math.max(
      item.preferredRadius + (currentR - item.preferredRadius) * 0.35,
      item.preferredRadius - 4
    ),
    item.preferredRadius + radiusSlack
  );
  item.logX = radius * Math.cos(angle);
  item.logY = radius * Math.sin(angle);
  item.posX = polarCatalogPosition(angle, radius).posX;
  item.posY = polarCatalogPosition(angle, radius).posY;
}

/** Empuja nodos superpuestos (legacy — preferir enforceGlobalNodeSeparation). */
export function separateCatalogPoints(points: CatalogLayoutPoint[]): CatalogLayoutPoint[] {
  return enforceGlobalNodeSeparation(points);
}

export {
  MIN_NODE_CENTER_DISTANCE_PX,
  assignStableSlots,
  applyLayoutPolicyToCatalogSeeds,
  enforceGlobalNodeSeparation,
  nudgePositionClearOfNodes,
  positionFromCatalogSlot,
  type CatalogLayoutSlot,
} from './catalogLayoutPolicy';

export function toCatalogLayoutPoint(
  slug: string,
  macroArea: MacroArea,
  logX: number,
  logY: number,
  posX: number,
  posY: number,
  preferredAngle?: number
): CatalogLayoutPoint {
  const angle = preferredAngle ?? Math.atan2(logY, logX);
  return {
    slug,
    macroArea,
    logX,
    logY,
    posX,
    posY,
    preferredRadius: Math.hypot(logX, logY),
    preferredAngle: angle,
  };
}

export { catalogGenerationPosition, catalogMentalBranchPosition, catalogNenMotherBranchPosition };
