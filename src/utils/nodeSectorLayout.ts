import {
  NEN_AXIS_LABELS,
  NEN_AXIS_VERTIENTES,
  NenAxisId,
  resolveVertienteId,
  VertienteId,
} from '@/src/config/nenConfig';
import { NEN_MOTHER_VECTOR_RAD } from '@/src/config/nenMotherRoots';
import { assignStableSlots } from '@/src/utils/catalogLayoutPolicy';
import { isRootLayer } from '@/src/utils/nodeColors';
import { MacroArea, SkillNode } from '@/src/types';

import {
  GENERATION_GAP_PX,
  logicalToPos,
  MAP_ORIGIN_X,
  MAP_ORIGIN_Y,
  normalizeAngleRad,
  NEN_HEXAGON_CLOCKWISE_FROM_NE,
  NEN_HEXAGON_VERTEX_DEG,
  ORB_RADIUS,
  posToLogical,
} from './mapGeometry';
import { getNodeCenter } from './treeLayout';

/** Abanico máximo por rama: ±25° (50° total). */
export const SECTOR_FAN_HALF_DEG = 25;
export const SECTOR_FAN_HALF_RAD = (SECTOR_FAN_HALF_DEG * Math.PI) / 180;

/** Gen 1 debe estar al menos a 200px del centro del mapa. */
export const MIN_GEN1_CENTER_DISTANCE_PX = 200;

/** Distancia mínima entre orbes hermanos en la misma generación. */
export const MIN_SIBLING_ORB_DISTANCE_PX = 80;

/** Desvío angular cuando dos vertientes comparten el mismo eje Nen. */
export const VERTIENTE_BRANCH_OFFSET_RAD: Partial<Record<VertienteId, number>> = {
  judo: -0.32,
  fisioterapia: 0.32,
  nervioso: -0.32,
  lectura: 0.32,
};

export interface MacroAreaSectorConfig {
  axisId: NenAxisId;
  branchAngleRad: number;
  branchAngleDeg: number;
  vertienteId: VertienteId | null;
}

export interface CatalogSectorEntry {
  slug: string;
  vertienteId: VertienteId;
  generation: number;
}

export interface SectorPlacementAuditRow {
  nodeId: number;
  slug: string | null;
  name: string;
  macroArea: MacroArea;
  vertienteId: VertienteId | null;
  expectedAxisId: NenAxisId | null;
  expectedAngleDeg: number;
  actualAngleDeg: number;
  deltaDeg: number;
  physicalSectorLabel: string;
}

export interface SectorMigrationVerification {
  outOfSector: SectorPlacementAuditRow[];
  gen1TooClose: { slug: string | null; name: string; distancePx: number }[];
  siblingTooClose: { a: string; b: string; distancePx: number }[];
  ok: boolean;
}

export function axisIdForVertiente(vertienteId: VertienteId): NenAxisId | null {
  for (const [axisId, vertientes] of Object.entries(NEN_AXIS_VERTIENTES) as [
    NenAxisId,
    readonly VertienteId[],
  ][]) {
    if (vertientes.includes(vertienteId)) return axisId;
  }
  return null;
}

export function resolveLayoutAxisId(vertienteId: VertienteId): NenAxisId {
  return axisIdForVertiente(vertienteId) ?? 'specialization';
}

export function canvasDegFromLogicalRad(angleRad: number): number {
  const deg = (-angleRad * 180) / Math.PI;
  return ((deg % 360) + 360) % 360;
}

export function logicalRadFromCanvasDeg(deg: number): number {
  return normalizeAngleRad((-deg * Math.PI) / 180);
}

export function angularDeltaDeg(aDeg: number, bDeg: number): number {
  const a = ((aDeg % 360) + 360) % 360;
  const b = ((bDeg % 360) + 360) % 360;
  const diff = Math.abs(a - b);
  return Math.min(diff, 360 - diff);
}

export function buildSectorConfigForVertiente(
  vertienteId: VertienteId
): MacroAreaSectorConfig {
  const axisId = resolveLayoutAxisId(vertienteId);
  const offset = VERTIENTE_BRANCH_OFFSET_RAD[vertienteId] ?? 0;
  const branchAngleRad = normalizeAngleRad(NEN_MOTHER_VECTOR_RAD[axisId] + offset);
  return {
    axisId,
    branchAngleRad,
    branchAngleDeg: canvasDegFromLogicalRad(branchAngleRad),
    vertienteId,
  };
}

/** Radio desde el centro: Gen n → n×250px (Gen 0 / vertiente = 250px). */
export function sectorRadiusPx(catalogGeneration: number): number {
  const gen = Math.max(0, Math.floor(catalogGeneration));
  return (gen + 1) * GENERATION_GAP_PX;
}

function siblingAngularOffset(
  siblingIndex: number,
  siblingCount: number,
  halfFanRad = SECTOR_FAN_HALF_RAD
): number {
  if (siblingCount <= 1) return 0;
  const totalSpan = 2 * halfFanRad;
  const step = totalSpan / (siblingCount - 1);
  return -halfFanRad + siblingIndex * step;
}

/** Aumenta el radio si hace falta para respetar MIN_SIBLING_ORB_DISTANCE_PX dentro del abanico. */
export function effectiveSectorRadiusPx(generation: number, siblingCount: number): number {
  let radius = sectorRadiusPx(generation);
  if (siblingCount <= 1) return radius;

  const halfFanRad = SECTOR_FAN_HALF_RAD;
  const minDist = MIN_SIBLING_ORB_DISTANCE_PX;
  const pairAngle = 2 * Math.asin(Math.min(1, minDist / (2 * radius)));
  const requiredSpan = pairAngle * (siblingCount - 1);

  if (requiredSpan > 2 * halfFanRad) {
    const neededRadius = minDist / (2 * Math.sin(halfFanRad / (siblingCount - 1)));
    radius = Math.max(radius, neededRadius);
  }

  return radius;
}

/**
 * Posición determinista de un nodo en su sector angular.
 * anguloBase + abanico ±25°; radio = generación × 250px (ajustado por densidad).
 */
export function recalcularPosicionNodo(
  sectorConfig: MacroAreaSectorConfig,
  generation: number,
  siblingIndex: number,
  siblingCount: number
): { posX: number; posY: number; logX: number; logY: number; angleRad: number; radius: number } {
  const radius = effectiveSectorRadiusPx(generation, siblingCount);
  const offset = siblingAngularOffset(siblingIndex, siblingCount);
  const angleRad = normalizeAngleRad(sectorConfig.branchAngleRad + offset);
  const logX = radius * Math.cos(angleRad);
  const logY = radius * Math.sin(angleRad);
  const { posX, posY } = logicalToPos(logX, logY);
  return { posX, posY, logX, logY, angleRad, radius };
}

export function computeSectorPositionsForCatalog(
  entries: CatalogSectorEntry[]
): Map<string, { posX: number; posY: number }> {
  const slotted = assignStableSlots(entries, (entry) => `${entry.vertienteId}:${entry.generation}`);
  const positions = new Map<string, { posX: number; posY: number }>();

  for (const entry of slotted) {
    const config = buildSectorConfigForVertiente(entry.vertienteId);
    const placement = recalcularPosicionNodo(
      config,
      entry.generation,
      entry.slotIndex,
      entry.siblingCount
    );
    positions.set(entry.slug, { posX: placement.posX, posY: placement.posY });
  }

  return positions;
}

function physicalSectorLabel(angleDeg: number): string {
  let bestAxis: NenAxisId = NEN_HEXAGON_CLOCKWISE_FROM_NE[0];
  let bestDelta = angularDeltaDeg(angleDeg, NEN_HEXAGON_VERTEX_DEG[bestAxis]);

  for (const axisId of NEN_HEXAGON_CLOCKWISE_FROM_NE) {
    const delta = angularDeltaDeg(angleDeg, NEN_HEXAGON_VERTEX_DEG[axisId]);
    if (delta < bestDelta) {
      bestAxis = axisId;
      bestDelta = delta;
    }
  }

  return `${NEN_AXIS_LABELS[bestAxis]} (~${NEN_HEXAGON_VERTEX_DEG[bestAxis]}°)`;
}

export function auditNodesOutsideSector(
  nodes: SkillNode[],
  toleranceDeg = SECTOR_FAN_HALF_DEG
): SectorPlacementAuditRow[] {
  const rows: SectorPlacementAuditRow[] = [];
  const strictTolerance = toleranceDeg + 0.05;

  for (const node of nodes) {
    if (isRootLayer(node) || node.isDeleted || node.layer === 'dormant') continue;

    const vertienteId = resolveVertienteId(node, nodes);
    if (!vertienteId) continue;

    const config = buildSectorConfigForVertiente(vertienteId);
    const { logX, logY } = posToLogical(node.posX, node.posY);
    const actualAngleRad = Math.atan2(logY, logX);
    const deltaRad = Math.abs(
      normalizeAngleRad(actualAngleRad - config.branchAngleRad)
    );
    const deltaDeg = (deltaRad * 180) / Math.PI;

    if (deltaDeg > strictTolerance) {
      rows.push({
        nodeId: node.id,
        slug: node.slug,
        name: node.name,
        macroArea: node.macroArea,
        vertienteId,
        expectedAxisId: config.axisId,
        expectedAngleDeg: config.branchAngleDeg,
        actualAngleDeg: canvasDegFromLogicalRad(actualAngleRad),
        deltaDeg: Math.round(deltaDeg * 10) / 10,
        physicalSectorLabel: physicalSectorLabel(canvasDegFromLogicalRad(actualAngleRad)),
      });
    }
  }

  return rows.sort((a, b) => b.deltaDeg - a.deltaDeg);
}

export function verifySectorMigration(nodes: SkillNode[]): SectorMigrationVerification {
  const outOfSector = auditNodesOutsideSector(nodes);
  const gen1TooClose: SectorMigrationVerification['gen1TooClose'] = [];
  const siblingTooClose: SectorMigrationVerification['siblingTooClose'] = [];

  const active = nodes.filter(
    (n) => !n.isDeleted && !isRootLayer(n) && n.layer !== 'dormant'
  );

  for (const node of active) {
    const vertienteId = resolveVertienteId(node, active);
    if (!vertienteId) continue;

    const center = getNodeCenter(node);
    const dist = Math.hypot(center.x - MAP_ORIGIN_X, center.y - MAP_ORIGIN_Y);
    const isGen1Ring = dist >= GENERATION_GAP_PX - 60 && dist <= GENERATION_GAP_PX + 120;

    if (isGen1Ring && dist < MIN_GEN1_CENTER_DISTANCE_PX) {
      gen1TooClose.push({
        slug: node.slug,
        name: node.name,
        distancePx: Math.round(dist),
      });
    }
  }

  const groups = new Map<string, SkillNode[]>();
  for (const node of active) {
    const vertienteId = resolveVertienteId(node, active);
    if (!vertienteId) continue;
    const center = getNodeCenter(node);
    const dist = Math.round(Math.hypot(center.x - MAP_ORIGIN_X, center.y - MAP_ORIGIN_Y));
    const key = `${vertienteId}:${dist}`;
    const bucket = groups.get(key) ?? [];
    bucket.push(node);
    groups.set(key, bucket);
  }

  for (const bucket of groups.values()) {
    for (let i = 0; i < bucket.length; i++) {
      for (let j = i + 1; j < bucket.length; j++) {
        const a = getNodeCenter(bucket[i]);
        const b = getNodeCenter(bucket[j]);
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < MIN_SIBLING_ORB_DISTANCE_PX) {
          siblingTooClose.push({
            a: bucket[i].slug ?? bucket[i].name,
            b: bucket[j].slug ?? bucket[j].name,
            distancePx: Math.round(d),
          });
        }
      }
    }
  }

  return {
    outOfSector,
    gen1TooClose,
    siblingTooClose,
    ok: outOfSector.length === 0 && gen1TooClose.length === 0 && siblingTooClose.length === 0,
  };
}

export function logSectorMigrationVerification(nodes: SkillNode[]): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;

  const report = verifySectorMigration(nodes);
  console.log('[SectorLayout] Verificación post-migración');
  console.log(`  · Fuera de sector (±${SECTOR_FAN_HALF_DEG}°): ${report.outOfSector.length}`);
  console.log(`  · Gen 1 < ${MIN_GEN1_CENTER_DISTANCE_PX}px del centro: ${report.gen1TooClose.length}`);
  console.log(`  · Hermanos < ${MIN_SIBLING_ORB_DISTANCE_PX}px: ${report.siblingTooClose.length}`);

  if (!report.ok) {
    report.outOfSector.slice(0, 8).forEach((row) => {
      console.log(
        `    ✗ ${row.name} (${row.slug ?? 'sin slug'}) — esperado ${row.expectedAngleDeg}°, actual ${row.actualAngleDeg}° (Δ${row.deltaDeg}°) en ${row.physicalSectorLabel}`
      );
    });
  } else {
    console.log('  · Todas las comprobaciones OK ✓');
  }
}

export function resolveCustomNodeSectorPlacement(
  nodes: SkillNode[],
  node: SkillNode,
  parent: SkillNode | null
): { posX: number; posY: number } {
  const vertienteId =
    resolveVertienteId(node, nodes) ??
    (parent ? resolveVertienteId(parent, nodes) : null);

  if (!vertienteId) {
    const fallbackAxis = resolveLayoutAxisId('coding');
    const config: MacroAreaSectorConfig = {
      axisId: fallbackAxis,
      branchAngleRad: NEN_MOTHER_VECTOR_RAD[fallbackAxis],
      branchAngleDeg: canvasDegFromLogicalRad(NEN_MOTHER_VECTOR_RAD[fallbackAxis]),
      vertienteId: null,
    };
    return recalcularPosicionNodo(config, 1, 0, 1);
  }

  const generation = resolveNodeCatalogGeneration(nodes, node, parent);
  const groupKey = `${vertienteId}:${generation}`;
  const peers = [
    ...nodes.filter((candidate) => {
      if (candidate.isDeleted || candidate.id === node.id) return false;
      if (resolveVertienteId(candidate, nodes) !== vertienteId) return false;
      return resolveNodeCatalogGeneration(nodes, candidate, getParentNode(nodes, candidate)) === generation;
    }),
    node,
  ].sort((a, b) => (a.slug ?? a.name).localeCompare(b.slug ?? b.name));

  const siblingIndex = peers.findIndex(
    (peer) => peer.id === node.id || (peer.id === -1 && node.id === -1)
  );
  const siblingCount = peers.length;
  const config = buildSectorConfigForVertiente(vertienteId);

  return recalcularPosicionNodo(
    config,
    generation,
    Math.max(0, siblingIndex),
    Math.max(1, siblingCount)
  );
}

function getParentNode(nodes: SkillNode[], node: SkillNode): SkillNode | null {
  if (node.parentId == null) return null;
  return nodes.find((candidate) => candidate.id === node.parentId) ?? null;
}

export function resolveNodeCatalogGeneration(
  nodes: SkillNode[],
  node: SkillNode,
  parent: SkillNode | null
): number {
  if (node.slug?.startsWith('discipline_')) return 0;
  if (parent && isRootLayer(parent)) return 0;
  if (parent?.slug?.startsWith('discipline_')) return 1;

  let depth = 1;
  let current = parent;
  while (current && !current.slug?.startsWith('discipline_') && !isRootLayer(current)) {
    depth += 1;
    current = getParentNode(nodes, current);
  }

  return Math.min(6, depth);
}
