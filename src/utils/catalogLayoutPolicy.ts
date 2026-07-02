import { ROOT_SEEDS } from '@/src/database/rootSeeds';
import type { CatalogNodeSeed } from '@/src/data/skillCatalogSeeds';
import { MacroArea } from '@/src/types';

import {
  catalogGenerationPosition,
  MAP_ORIGIN_X,
  MAP_ORIGIN_Y,
  normalizeAngleRad,
  ORB_RADIUS,
  ORB_SIZE,
} from './mapGeometry';

/** Distancia mínima entre centros de dos nodos (orbe + margen para etiqueta). */
export const MIN_NODE_CENTER_DISTANCE_PX = ORB_SIZE + 80;

/** Colchón extra al empujar para evitar empates por redondeo flotante. */
const SEPARATION_EPSILON_PX = 2;

export interface CatalogLayoutPoint {
  slug: string;
  macroArea: MacroArea;
  logX: number;
  logY: number;
  posX: number;
  posY: number;
  preferredRadius: number;
  /** Ángulo de la vertiente asignada al crear el slot (no mover más allá de LAYOUT_MAX_ANGULAR_DRIFT_RAD). */
  preferredAngle?: number;
}

function toCatalogLayoutPoint(
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

/** Cuánto puede alejarse un nodo de su órbita preferida al resolver colisiones. */
export const LAYOUT_MAX_OUTWARD_DRIFT_PX = 220;

/** Cuánto puede acercarse hacia afuera en ángulo (rad) al empujar hermanos. */
export const LAYOUT_MAX_ANGULAR_DRIFT_RAD = Math.PI / 9;

/**
 * Identidad de layout de un nodo de catálogo.
 * Cada nodo futuro debe declarar: rama (ángulo), generación y slot estable (orden alfabético por slug).
 */
export interface CatalogLayoutSlot {
  slug: string;
  macroArea: MacroArea;
  branchAngleRad: number;
  generation: number;
  slotIndex: number;
  siblingCount: number;
}

export function positionFromCatalogSlot(slot: CatalogLayoutSlot): CatalogLayoutPoint {
  const polar = catalogGenerationPosition(
    slot.branchAngleRad,
    slot.generation,
    slot.slotIndex,
    slot.siblingCount
  );
  return toCatalogLayoutPoint(
    slot.slug,
    slot.macroArea,
    polar.logX,
    polar.logY,
    polar.posX,
    polar.posY,
    slot.branchAngleRad
  );
}

function logicalFromPoint(point: CatalogLayoutPoint) {
  return { logX: point.logX, logY: point.logY };
}

function applyLogicalToPoint(point: CatalogLayoutPoint, logX: number, logY: number) {
  point.logX = logX;
  point.logY = logY;
  point.posX = MAP_ORIGIN_X + logX - ORB_RADIUS;
  point.posY = MAP_ORIGIN_Y + logY - ORB_RADIUS;
}

/** Mantiene la vertiente; permite aumentar radio y un poco de ángulo (nunca invadir hacia el centro). */
function snapAllowOutwardDrift(
  point: CatalogLayoutPoint,
  maxOutwardDrift = LAYOUT_MAX_OUTWARD_DRIFT_PX,
  maxAngularDrift = LAYOUT_MAX_ANGULAR_DRIFT_RAD
) {
  const preferredAngle = point.preferredAngle ?? Math.atan2(point.logY, point.logX);
  let angle = Math.atan2(point.logY, point.logX);
  let delta = normalizeAngleRad(angle - preferredAngle);
  delta = Math.min(maxAngularDrift, Math.max(-maxAngularDrift, delta));
  angle = normalizeAngleRad(preferredAngle + delta);

  const currentR = Math.hypot(point.logX, point.logY);
  const minR = point.preferredRadius;
  const maxR = point.preferredRadius + maxOutwardDrift;
  const radius = Math.min(maxR, Math.max(minR, currentR));
  applyLogicalToPoint(point, radius * Math.cos(angle), radius * Math.sin(angle));
}

function countViolations(items: CatalogLayoutPoint[], minDist: number): number {
  let violations = 0;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const dist = Math.hypot(items[i].logX - items[j].logX, items[i].logY - items[j].logY);
      if (dist < minDist - SEPARATION_EPSILON_PX) violations++;
    }
  }
  return violations;
}

function runSeparationPass(
  items: CatalogLayoutPoint[],
  minDist: number,
  anchors: ReadonlySet<string>,
  maxOutwardDrift: number,
  maxIterations: number
): boolean {
  let moved = false;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let passMoved = false;

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        const dx = b.logX - a.logX;
        const dy = b.logY - a.logY;
        const dist = Math.hypot(dx, dy);

        if (dist >= minDist) continue;

        let ux = dx / (dist || 1);
        let uy = dy / (dist || 1);
        if (dist < 0.001) {
          const spread = ((i * 31 + j * 17) % 360) * (Math.PI / 180);
          ux = Math.cos(spread);
          uy = Math.sin(spread);
        }

        const push = minDist - Math.max(dist, 0);
        const aAnchored = anchors.has(a.slug);
        const bAnchored = anchors.has(b.slug);

        if (aAnchored && bAnchored) continue;

        if (aAnchored) {
          b.logX += ux * push;
          b.logY += uy * push;
          snapAllowOutwardDrift(b, maxOutwardDrift);
        } else if (bAnchored) {
          a.logX -= ux * push;
          a.logY -= uy * push;
          snapAllowOutwardDrift(a, maxOutwardDrift);
        } else {
          const half = push / 2;
          a.logX -= ux * half;
          a.logY -= uy * half;
          b.logX += ux * half;
          b.logY += uy * half;
          snapAllowOutwardDrift(a, maxOutwardDrift);
          snapAllowOutwardDrift(b, maxOutwardDrift);
        }

        passMoved = true;
      }
    }

    moved = moved || passMoved;
    if (!passMoved) break;
  }

  return moved;
}

export interface GlobalSeparationOptions {
  minDistance?: number;
  anchorSlugs?: ReadonlySet<string>;
  maxOutwardDrift?: number;
  maxIterations?: number;
}

/**
 * Resuelve colisiones entre todos los nodos del lienzo de catálogo.
 * Los anclajes (raíces Nen) no se mueven; el resto se empuja radialmente hacia afuera.
 */
export function enforceGlobalNodeSeparation(
  points: CatalogLayoutPoint[],
  options: GlobalSeparationOptions = {}
): CatalogLayoutPoint[] {
  const minDist = options.minDistance ?? MIN_NODE_CENTER_DISTANCE_PX;
  const targetDist = minDist + SEPARATION_EPSILON_PX;
  const anchors = options.anchorSlugs ?? new Set<string>();
  const baseOutwardDrift = options.maxOutwardDrift ?? LAYOUT_MAX_OUTWARD_DRIFT_PX;
  const maxIterations = options.maxIterations ?? 80;

  const items = points.map((point) => ({
    ...point,
    preferredAngle: point.preferredAngle ?? Math.atan2(point.logY, point.logX),
  }));

  let outwardDrift = baseOutwardDrift;

  for (let attempt = 0; attempt < 4; attempt++) {
    runSeparationPass(items, targetDist, anchors, outwardDrift, maxIterations);
    if (countViolations(items, minDist) === 0) break;
    outwardDrift += 80;
  }

  return items;
}

function rootAnchorPoints(): CatalogLayoutPoint[] {
  return ROOT_SEEDS.map((root) =>
    toCatalogLayoutPoint(
      root.slug,
      root.macroArea,
      root.posX + ORB_RADIUS - MAP_ORIGIN_X,
      root.posY + ORB_RADIUS - MAP_ORIGIN_Y,
      root.posX,
      root.posY
    )
  );
}

/** Aplica separación global a todas las semillas de catálogo (incluye galaxias física/mental). */
export function applyLayoutPolicyToCatalogSeeds(seeds: CatalogNodeSeed[]): CatalogNodeSeed[] {
  if (seeds.length === 0) return seeds;

  const anchorSlugs = new Set(ROOT_SEEDS.map((root) => root.slug));
  const catalogPoints = seeds.map((seed) =>
    toCatalogLayoutPoint(
      seed.slug,
      seed.macroArea,
      seed.posX + ORB_RADIUS - MAP_ORIGIN_X,
      seed.posY + ORB_RADIUS - MAP_ORIGIN_Y,
      seed.posX,
      seed.posY
    )
  );

  const separated = enforceGlobalNodeSeparation([...rootAnchorPoints(), ...catalogPoints], {
    anchorSlugs,
  });

  const bySlug = new Map(separated.map((point) => [point.slug, point]));

  return seeds.map((seed) => {
    const point = bySlug.get(seed.slug);
    if (!point) return seed;
    return { ...seed, posX: point.posX, posY: point.posY };
  });
}

/** Agrupa entradas por clave y asigna slotIndex estable (orden alfabético por slug). */
export function assignStableSlots<T extends { slug: string }>(
  entries: T[],
  groupKey: (entry: T) => string
): Array<T & { slotIndex: number; siblingCount: number }> {
  const groups = new Map<string, T[]>();

  for (const entry of entries) {
    const key = groupKey(entry);
    const bucket = groups.get(key) ?? [];
    bucket.push(entry);
    groups.set(key, bucket);
  }

  const result: Array<T & { slotIndex: number; siblingCount: number }> = [];

  for (const bucket of groups.values()) {
    const sorted = [...bucket].sort((a, b) => a.slug.localeCompare(b.slug));
    const siblingCount = sorted.length;
    sorted.forEach((entry, slotIndex) => {
      result.push({ ...entry, slotIndex, siblingCount });
    });
  }

  return result;
}

/** Desplaza una posición candidata hasta respetar distancia mínima (nodos custom / guías). */
export function nudgePositionClearOfNodes(
  posX: number,
  posY: number,
  occupiedCenters: readonly { x: number; y: number }[],
  minDistance = MIN_NODE_CENTER_DISTANCE_PX
): { posX: number; posY: number } {
  let cx = posX + ORB_RADIUS;
  let cy = posY + ORB_RADIUS;
  const maxAttempts = 48;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let collision = false;

    for (const other of occupiedCenters) {
      const dx = cx - other.x;
      const dy = cy - other.y;
      const dist = Math.hypot(dx, dy);

      if (dist >= minDistance) continue;

      collision = true;
      const push = minDistance - dist + 2;
      if (dist < 0.001) {
        const angle = (attempt / maxAttempts) * Math.PI * 2;
        cx += Math.cos(angle) * minDistance;
        cy += Math.sin(angle) * minDistance;
      } else {
        cx += (dx / dist) * push;
        cy += (dy / dist) * push;
      }
      break;
    }

    if (!collision) break;
  }

  return { posX: cx - ORB_RADIUS, posY: cy - ORB_RADIUS };
}
