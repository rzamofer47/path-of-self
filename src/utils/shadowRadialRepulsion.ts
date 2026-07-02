import { MacroArea, SkillNode } from '@/src/types';

import {
  clampAngleToSector,
  logicalToPos,
  MAP_ORIGIN_X,
  MAP_ORIGIN_Y,
  nodeCenterToLogical,
  normalizeAngleRad,
  ORBIT_2_RADIUS,
  SECTOR_CENTER_RAD,
  SECTOR_HALF_WIDTH_DEG,
} from './polarLayout';
import { CANVAS_HEIGHT, CANVAS_WIDTH, clamp, getNodeCenter, ORB_RADIUS, ORB_SIZE } from './treeLayout';

/** Diámetro visual del orbe + margen de aire. */
const ORB_BODY = 58;
const MIN_CENTER_DIST = ORB_BODY + 10;
const REPULSION_RADIUS = ORB_BODY * 2.4;
const ITERATIONS = 16;
const FORCE_DAMPING = 0.72;
const SECTOR_HALF_WIDTH_RAD = (SECTOR_HALF_WIDTH_DEG * Math.PI) / 180;
const FAN_MIN_ANGLE_RAD = (13 * Math.PI) / 180;
const SURFACE_AVOID_ANGLE_RAD = (16 * Math.PI) / 180;

function nodeCenter(node: SkillNode) {
  return getNodeCenter(node);
}

function isSurfaceRepulsor(node: SkillNode): boolean {
  return node.layer === 'custom' || node.layer === 'root';
}

/** Empuja nodos de la capa oscura lejos de los orbes activos de superficie. */
export function applyMagneticRadialRepulsion(
  shadowNodes: SkillNode[],
  surfaceNodes: SkillNode[]
): SkillNode[] {
  if (shadowNodes.length === 0) return shadowNodes;

  const repulsors = surfaceNodes.filter(isSurfaceRepulsor);
  const result = shadowNodes.map((node) => ({ ...node }));

  for (let pass = 0; pass < ITERATIONS; pass++) {
    for (let i = 0; i < result.length; i++) {
      const shadow = result[i];
      let cx = shadow.posX + ORB_RADIUS;
      let cy = shadow.posY + ORB_RADIUS;

      let fx = 0;
      let fy = 0;

      for (const surface of repulsors) {
        if (surface.macroArea !== shadow.macroArea) continue;

        const sc = nodeCenter(surface);
        const dx = cx - sc.x;
        const dy = cy - sc.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.001 || dist > REPULSION_RADIUS) continue;

        const dirX = dx / dist;
        const dirY = dy / dist;
        const overlap = Math.max(0, MIN_CENTER_DIST - dist);
        const field = ((REPULSION_RADIUS - dist) / REPULSION_RADIUS) * MIN_CENTER_DIST * 0.42;
        const magnitude = overlap * 1.35 + field;

        fx += dirX * magnitude;
        fy += dirY * magnitude;
      }

      for (let j = 0; j < result.length; j++) {
        if (i === j) continue;
        const other = result[j];
        if (other.macroArea !== shadow.macroArea) continue;

        const oc = nodeCenter(other);
        const dx = cx - oc.x;
        const dy = cy - oc.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.001 || dist >= MIN_CENTER_DIST) continue;

        const push = (MIN_CENTER_DIST - dist) * 0.75;
        fx += (dx / dist) * push;
        fy += (dy / dist) * push;
      }

      const logX = cx - MAP_ORIGIN_X;
      const logY = cy - MAP_ORIGIN_Y;
      const radius = Math.hypot(logX, logY) || 1;
      fx += (logX / radius) * 3.5;
      fy += (logY / radius) * 3.5;

      cx += fx * FORCE_DAMPING;
      cy += fy * FORCE_DAMPING;

      let lx = cx - MAP_ORIGIN_X;
      let ly = cy - MAP_ORIGIN_Y;
      let r = Math.hypot(lx, ly);
      const angle = clampAngleToSector(Math.atan2(ly, lx), shadow.macroArea);
      r = Math.max(r, ORBIT_2_RADIUS * 0.82);
      lx = r * Math.cos(angle);
      ly = r * Math.sin(angle);

      const pos = logicalToPos(lx, ly);
      result[i] = {
        ...shadow,
        posX: clamp(pos.posX, 0, CANVAS_WIDTH - ORB_SIZE),
        posY: clamp(pos.posY, 0, CANVAS_HEIGHT - ORB_SIZE),
      };
    }
  }

  reflowShadowFanBySector(result, repulsors);
  return result;
}

/** Reordena sombras en abanico radial dentro del sector, evitando ángulos ocupados. */
function reflowShadowFanBySector(shadowNodes: SkillNode[], surfaceNodes: SkillNode[]): void {
  const macroAreas: MacroArea[] = [
    'physical',
    'intellectual',
    'mental_emotional',
    'productive',
  ];

  for (const macroArea of macroAreas) {
    const sectorShadows = shadowNodes.filter((n) => n.macroArea === macroArea);
    if (sectorShadows.length === 0) continue;

    const surfaceAngles = surfaceNodes
      .filter((n) => n.macroArea === macroArea && n.layer === 'custom')
      .map((n) => {
        const c = nodeCenter(n);
        const l = nodeCenterToLogical(c.x, c.y);
        return Math.atan2(l.y, l.x);
      });

    const items = sectorShadows.map((node) => {
      const c = nodeCenter(node);
      const l = nodeCenterToLogical(c.x, c.y);
      return {
        node,
        angle: Math.atan2(l.y, l.x),
        radius: Math.max(Math.hypot(l.x, l.y), ORBIT_2_RADIUS * 0.82),
      };
    });

    items.sort((a, b) => a.angle - b.angle);

    const sectorCenter = SECTOR_CENTER_RAD[macroArea];
    const halfArc = SECTOR_HALF_WIDTH_RAD * 0.9;
    const count = items.length;
    const maxStep = (22 * Math.PI) / 180;
    const step = Math.min(
      count > 1 ? (halfArc * 2) / (count + 0.5) : halfArc,
      maxStep
    );
    const totalSpan = step * Math.max(count - 1, 0);
    let cursor = sectorCenter - totalSpan / 2;

    for (let i = 0; i < items.length; i++) {
      let targetAngle = count === 1 ? sectorCenter : cursor + i * step;

      for (const occupied of surfaceAngles) {
        let delta = normalizeAngleRad(targetAngle - occupied);
        if (Math.abs(delta) < SURFACE_AVOID_ANGLE_RAD) {
          const nudge = Math.sign(delta || 1) * SURFACE_AVOID_ANGLE_RAD;
          targetAngle = clampAngleToSector(occupied + nudge, macroArea);
        }
      }

      if (i > 0) {
        const prev = items[i - 1];
        const prevAngle = Math.atan2(
          nodeCenter(prev.node).y - MAP_ORIGIN_Y,
          nodeCenter(prev.node).x - MAP_ORIGIN_X
        );
        const minAllowed = prevAngle + FAN_MIN_ANGLE_RAD;
        if (targetAngle < minAllowed) {
          targetAngle = clampAngleToSector(minAllowed, macroArea);
        }
      }

      targetAngle = clampAngleToSector(targetAngle, macroArea);
      const logX = items[i].radius * Math.cos(targetAngle);
      const logY = items[i].radius * Math.sin(targetAngle);
      const pos = logicalToPos(logX, logY);

      items[i].node.posX = clamp(pos.posX, 0, CANVAS_WIDTH - ORB_SIZE);
      items[i].node.posY = clamp(pos.posY, 0, CANVAS_HEIGHT - ORB_SIZE);
    }
  }
}

/** Layout completo de la capa oscura: baseline + repulsión magnética radial. */
let cachedLayoutKey = '';
let cachedLayoutResult: SkillNode[] | null = null;

function buildLayoutCacheKey(surfaceNodes: SkillNode[], shadowBaseline: SkillNode[]): string {
  const surfaceKey = surfaceNodes
    .filter(isSurfaceRepulsor)
    .map((n) => `${n.id}:${Math.round(n.posX)}:${Math.round(n.posY)}:${n.layer}`)
    .sort()
    .join(';');
  const shadowKey = shadowBaseline
    .map((n) => `${n.id}:${n.slug ?? ''}:${n.name}:${Math.round(n.posX)}:${Math.round(n.posY)}`)
    .sort()
    .join(';');
  return `${surfaceKey}|${shadowKey}`;
}

/** Invalida caché de layout (p. ej. tras crear, banish o reactivar nodo). */
export function clearShadowLayoutCache(): void {
  cachedLayoutKey = '';
  cachedLayoutResult = null;
}

export function layoutShadowLayer(
  surfaceNodes: SkillNode[],
  shadowBaseline: SkillNode[]
): SkillNode[] {
  const key = buildLayoutCacheKey(surfaceNodes, shadowBaseline);
  if (key === cachedLayoutKey && cachedLayoutResult) {
    return cachedLayoutResult.map((node) => ({ ...node }));
  }

  const result = applyMagneticRadialRepulsion(shadowBaseline, surfaceNodes);
  cachedLayoutKey = key;
  cachedLayoutResult = result.map((node) => ({ ...node }));
  return result;
}
