import { MacroArea, SkillNode } from '@/src/types';
import { NEN_ROOT_SLUG_BY_MACRO } from '@/src/config/nenMotherRoots';
import { resolveVertienteId, VertienteId } from '@/src/config/nenConfig';

import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  MAP_ORIGIN_X,
  MAP_ORIGIN_Y,
  ORB_RADIUS,
  ORB_SIZE,
  ORBIT_2_RADIUS,
  ORBIT_3_RADIUS,
  ORBIT_4_RADIUS,
  ROOT_ORBIT_RADIUS,
  SECTOR_CENTER_DEG,
  SECTOR_CENTER_RAD,
  logicalToPos,
  sectorRootPosition,
} from './mapGeometry';
import {
  buildSectorConfigForVertiente,
  recalcularPosicionNodo,
  resolveCustomNodeSectorPlacement,
} from './nodeSectorLayout';
import {
  clamp,
  getNodeCenter,
} from './treeLayout';
import { isRootLayer } from './nodeColors';

export {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  MAP_ORIGIN_X,
  MAP_ORIGIN_Y,
  ORB_RADIUS,
  ORB_SIZE,
  ROOT_ORBIT_RADIUS,
  ORBIT_2_RADIUS,
  ORBIT_3_RADIUS,
  ORBIT_4_RADIUS,
  SECTOR_CENTER_DEG,
  SECTOR_CENTER_RAD,
  logicalToPos,
  sectorRootPosition,
} from './mapGeometry';

/** Radio de los 4 nodos raíz desde el centro. */
export const ORBIT_RADIUS_BY_DEPTH = [
  ROOT_ORBIT_RADIUS,
  ORBIT_2_RADIUS,
  ORBIT_3_RADIUS,
  ORBIT_4_RADIUS,
] as const;

/** Separación angular base entre hermanos dentro del sector. */
export const FAN_ANGLE_DEG = 16;
export const CLUSTER_SPREAD_DEG = 24;
export const CLUSTER_AIR_GAP_DEG = 8;

/** Umbral de hijos (custom + guide) para abrir el arco automáticamente. */
export const CROWDED_SIBLING_THRESHOLD = 4;

/** Medio ancho del sector por macro-área (±40° respecto al ángulo central). */
export const SECTOR_HALF_WIDTH_DEG = 40;

const SECTOR_HALF_WIDTH_RAD = (SECTOR_HALF_WIDTH_DEG * Math.PI) / 180;

export function nodeCenterToLogical(centerX: number, centerY: number) {
  return {
    x: centerX - MAP_ORIGIN_X,
    y: centerY - MAP_ORIGIN_Y,
  };
}

export function normalizeAngleRad(angle: number): number {
  let a = angle % (2 * Math.PI);
  if (a > Math.PI) a -= 2 * Math.PI;
  if (a <= -Math.PI) a += 2 * Math.PI;
  return a;
}

/** Limita un ángulo al sector exclusivo de la macro-área (sin cruzar cuadrantes). */
export function clampAngleToSector(angleRad: number, macroArea: MacroArea): number {
  const center = SECTOR_CENTER_RAD[macroArea];
  let delta = normalizeAngleRad(angleRad - center);
  delta = clamp(delta, -SECTOR_HALF_WIDTH_RAD, SECTOR_HALF_WIDTH_RAD);
  return normalizeAngleRad(center + delta);
}

export function getOutwardAngle(logX: number, logY: number, macroArea: MacroArea): number {
  const radius = Math.hypot(logX, logY);
  if (radius < 8) {
    return SECTOR_CENTER_RAD[macroArea];
  }
  return clampAngleToSector(Math.atan2(logY, logX), macroArea);
}

export function countParentChildren(nodes: SkillNode[], parentId: number): number {
  return nodes.filter(
    (n) =>
      (n.layer === 'custom' || n.layer === 'guide') &&
      n.parentId === parentId
  ).length;
}

/** Profundidad de rama: 1 = hijo directo de raíz. */
export function getBranchDepthFromRoot(nodes: SkillNode[], node: SkillNode): number {
  let depth = 0;
  let current: SkillNode | null = node;

  while (current && !isRootLayer(current)) {
    depth++;
    if (current.parentId != null) {
      current = nodes.find((n) => n.id === current!.parentId) ?? null;
    } else {
      current = getOrbitParent(nodes, current.macroArea);
    }
  }

  return depth;
}

export function getFanAngleStepDeg(siblingCount: number): number {
  if (siblingCount <= CROWDED_SIBLING_THRESHOLD) return FAN_ANGLE_DEG;
  return FAN_ANGLE_DEG + (siblingCount - CROWDED_SIBLING_THRESHOLD) * 10;
}

function getOrbitRadiusForDepth(depth: number): number {
  return ORBIT_RADIUS_BY_DEPTH[Math.min(Math.max(depth, 0), ORBIT_RADIUS_BY_DEPTH.length - 1)] ?? ORBIT_4_RADIUS;
}

function getClusterAngleOffset(childIndex: number, siblingCount: number): number {
  const count = Math.max(siblingCount, childIndex + 1, 1);
  if (count <= 1) return 0;

  const spreadRad = (CLUSTER_SPREAD_DEG * Math.PI) / 180;

  if (count === 2) {
    return childIndex === 0 ? -spreadRad / 2 : spreadRad / 2;
  }

  if (count === 3) {
    const offsets = [-spreadRad / 1.8, 0, spreadRad / 1.8];
    return offsets[childIndex] ?? offsets[offsets.length - 1];
  }

  if (count === 4) {
    const offsets = [-spreadRad / 1.45, -spreadRad / 4.8, spreadRad / 4.8, spreadRad / 1.45];
    return offsets[childIndex] ?? offsets[offsets.length - 1];
  }

  const stepRad = (getFanAngleStepDeg(count) * Math.PI) / 180;
  const arcRad = Math.min(SECTOR_HALF_WIDTH_RAD * 2 * 0.9, stepRad * Math.max(count - 1, 1));
  const t = childIndex / (count - 1);
  return -arcRad / 2 + t * arcRad;
}

/** Abanico de hermanos limitado al ancho del sector (±40°). */
function getFanOffsetWithinSector(childIndex: number, siblingCount: number, depth: number): number {
  const maxArc = SECTOR_HALF_WIDTH_RAD * 2 * 0.92;
  if (siblingCount <= 1) return 0;

  const clusterOffset = getClusterAngleOffset(childIndex, siblingCount);
  const depthBias = ((depth - 1) % 2 === 0 ? 1 : -1) * (CLUSTER_AIR_GAP_DEG * Math.PI) / 180;
  const offset = clusterOffset + depthBias;

  return clamp(offset, -maxArc / 2, maxArc / 2);
}

export interface SectorPlacementOptions {
  depth?: number;
  parentIsRoot?: boolean;
}

/**
 * Coloca un hijo dentro del sector de su macro-área, expandiendo radio hacia afuera.
 * El ángulo nunca sale del cuadrante asignado (±40° del centro sectorial).
 */
export function computeOutwardChildPosition(
  parentLogicalX: number,
  parentLogicalY: number,
  childIndex: number,
  macroArea: MacroArea,
  siblingCount?: number,
  options: SectorPlacementOptions = {}
) {
  const count = siblingCount ?? Math.max(childIndex + 1, 1);
  const depth = options.depth ?? 1;
  const childRadius = getOrbitRadiusForDepth(depth);

  const sectorCenter = SECTOR_CENTER_RAD[macroArea];
  const parentAngle = Math.atan2(parentLogicalY, parentLogicalX);

  const anchor = options.parentIsRoot
    ? sectorCenter
    : clampAngleToSector(parentAngle, macroArea);

  const fanOffset = getFanOffsetWithinSector(childIndex, count, depth);
  const childAngle = clampAngleToSector(anchor + fanOffset, macroArea);

  const logX = childRadius * Math.cos(childAngle);
  const logY = childRadius * Math.sin(childAngle);

  return {
    ...logicalToPos(logX, logY),
    radius: childRadius,
    angle: childAngle,
  };
}

export function getOrbitParent(
  nodes: SkillNode[],
  macroArea: MacroArea
): SkillNode | null {
  const preferredSlug = NEN_ROOT_SLUG_BY_MACRO[macroArea];
  const bySlug = nodes.find((n) => isRootLayer(n) && n.slug === preferredSlug);
  if (bySlug) return bySlug;
  return nodes.find((n) => isRootLayer(n) && n.macroArea === macroArea) ?? null;
}

export function countOrbitSiblings(nodes: SkillNode[], parent: SkillNode): number {
  return nodes.filter(
    (n) =>
      (n.layer === 'custom' || n.layer === 'guide' || n.layer === 'wildcard') &&
      (n.parentId === parent.id ||
        (n.parentId == null && n.layer === 'custom' && n.macroArea === parent.macroArea))
  ).length;
}

const DEFAULT_VERTIENTE_BY_MACRO: Record<MacroArea, VertienteId> = {
  physical: 'gimnasio',
  productive: 'coding',
  mental_emotional: 'nervioso',
  intellectual: 'guitar',
};

export function resolveSubSkillPlacement(
  nodes: SkillNode[],
  parent: SkillNode
): { posX: number; posY: number; parentId: number } {
  const draft: SkillNode = {
    id: -1,
    slug: null,
    name: '',
    type: parent.type,
    layer: 'custom',
    macroArea: parent.macroArea,
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
    guideUrl: null,
    colorRole: 'standard',
    parentId: parent.id,
    originPosX: null,
    originPosY: null,
    isDeleted: false,
    decayCategoria: null,
    createdAt: '',
  };
  const placement = resolveCustomNodeSectorPlacement(nodes, draft, parent);

  return {
    posX: clamp(placement.posX, 0, CANVAS_WIDTH - ORB_SIZE),
    posY: clamp(placement.posY, 0, CANVAS_HEIGHT - ORB_SIZE),
    parentId: parent.id,
  };
}

export function resolveOrbitPlacement(
  nodes: SkillNode[],
  macroArea: MacroArea
): { posX: number; posY: number; parentId: number | null } {
  const parent = getOrbitParent(nodes, macroArea);
  const vertienteId = DEFAULT_VERTIENTE_BY_MACRO[macroArea];
  const config = buildSectorConfigForVertiente(vertienteId);
  const siblings = nodes.filter(
    (node) =>
      !node.isDeleted &&
      (node.layer === 'custom' || node.layer === 'guide' || node.layer === 'wildcard') &&
      resolveVertienteId(node, nodes) === vertienteId
  );
  const placement = recalcularPosicionNodo(config, 0, siblings.length, siblings.length + 1);

  return {
    posX: clamp(placement.posX, 0, CANVAS_WIDTH - ORB_SIZE),
    posY: clamp(placement.posY, 0, CANVAS_HEIGHT - ORB_SIZE),
    parentId: parent?.id ?? null,
  };
}

/** Recalcula posiciones de nodos custom dentro de sectores Nen estrictos. */
export function recomputeCustomNodePositions(
  nodes: SkillNode[]
): Map<number, { posX: number; posY: number }> {
  const updates = new Map<number, { posX: number; posY: number }>();

  const customNodes = nodes
    .filter((node) => node.layer === 'custom' && !node.isDeleted)
    .sort((a, b) => a.id - b.id);

  for (const node of customNodes) {
    const parent =
      node.parentId != null
        ? nodes.find((candidate) => candidate.id === node.parentId) ?? null
        : getOrbitParent(nodes, node.macroArea);

    const placement = resolveCustomNodeSectorPlacement(nodes, node, parent);
    updates.set(node.id, { posX: placement.posX, posY: placement.posY });
  }

  return updates;
}

/** @deprecated Usar computeOutwardChildPosition */
export function computeOrbitPosition(
  parentCenterX: number,
  parentCenterY: number,
  childIndex: number,
  macroArea: MacroArea = 'intellectual'
) {
  const logical = nodeCenterToLogical(parentCenterX, parentCenterY);
  return computeOutwardChildPosition(
    logical.x,
    logical.y,
    childIndex,
    macroArea,
    undefined,
    { depth: 1, parentIsRoot: false }
  );
}

/** @deprecated Usar nodeCenterToLogical / logicalToPos */
export function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleRad: number
) {
  return {
    x: centerX + radius * Math.cos(angleRad),
    y: centerY + radius * Math.sin(angleRad),
  };
}
