import { resolveVertienteId } from '@/src/config/nenConfig';
import { isRootLayer, resolveParentNode } from '@/src/utils/nodeColors';
import {
  estimateForceLayoutOrbRadius,
  FORCE_LAYOUT_SECTOR_RADIUS_MAX,
  GENERATION_GAP_PX,
  MAP_ORIGIN_X,
  MAP_ORIGIN_Y,
  mentalGenerationRadiusPx,
  normalizeAngleRad,
  ROOT_ORBIT_RADIUS,
} from '@/src/utils/mapGeometry';
import {
  buildSectorConfigForVertiente,
  MIN_GEN1_CENTER_DISTANCE_PX,
  resolveNodeCatalogGeneration,
  SECTOR_FAN_HALF_RAD,
} from '@/src/utils/nodeSectorLayout';
import { ORB_RADIUS } from '@/src/utils/treeLayout';
import { SkillNode } from '@/src/types';

/** Activa el layout force-directed en TreeCanvas (alternativa a coordenadas estáticas). */
export const ENABLE_FORCE_DIRECTED_LAYOUT = true;

export const FORCE_LAYOUT_MAX_ITERATIONS = 120;
export const FORCE_LAYOUT_FRICTION = 0.6;
export const FORCE_LAYOUT_COOLING = 0.97;
export const FORCE_LAYOUT_ENERGY_THRESHOLD = 0.5;

export type SimNode = {
  id: string;
  skillNodeId: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number;
  fy?: number;
  sectorAngulo: number;
  sectorRadioMin: number;
  sectorRadioMax: number;
  radioOrbe: number;
  parentId?: string;
  generation: number;
};

const MAP_CENTER = { x: MAP_ORIGIN_X, y: MAP_ORIGIN_Y };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function nodeCenterFromSkillNode(node: SkillNode): { x: number; y: number } {
  return { x: node.posX + ORB_RADIUS, y: node.posY + ORB_RADIUS };
}

function skillPosFromCenter(x: number, y: number): { posX: number; posY: number } {
  return { posX: x - ORB_RADIUS, posY: y - ORB_RADIUS };
}

function resolveSectorAngle(node: SkillNode, allNodes: SkillNode[]): number {
  const vertienteId = resolveVertienteId(node, allNodes);
  if (vertienteId) {
    return buildSectorConfigForVertiente(vertienteId).branchAngleRad;
  }

  const parent = resolveParentNode(node, allNodes);
  if (parent) {
    const { x, y } = nodeCenterFromSkillNode(parent);
    return Math.atan2(y - MAP_CENTER.y, x - MAP_CENTER.x);
  }

  const { x, y } = nodeCenterFromSkillNode(node);
  return Math.atan2(y - MAP_CENTER.y, x - MAP_CENTER.x);
}

function sectorRadiusBounds(generation: number): { min: number; max: number } {
  const gen = clamp(Math.floor(generation), 0, 6);
  const centerR = mentalGenerationRadiusPx(gen);

  if (gen === 0) {
    return {
      min: ROOT_ORBIT_RADIUS * 0.85,
      max: centerR + GENERATION_GAP_PX * 0.4,
    };
  }

  return {
    min: Math.max(MIN_GEN1_CENTER_DISTANCE_PX, centerR - GENERATION_GAP_PX * 0.45),
    max: gen >= 6 ? FORCE_LAYOUT_SECTOR_RADIUS_MAX : centerR + GENERATION_GAP_PX * 0.45,
  };
}

function shouldParticipateInLayout(node: SkillNode): boolean {
  if (node.isDeleted) return false;
  if (node.layer === 'dormant') return false;
  return true;
}

/** Convierte nodos del árbol a partículas de simulación (solo en memoria). */
export function buildSimNodesFromSkillNodes(
  nodes: SkillNode[],
  pinnedCenters?: ReadonlyMap<number, { x: number; y: number }>
): SimNode[] {
  const active = nodes.filter(shouldParticipateInLayout);

  return active.map((node) => {
    const pinned = pinnedCenters?.get(node.id);
    const center = pinned ?? nodeCenterFromSkillNode(node);
    const parent = resolveParentNode(node, nodes);
    const generation = resolveNodeCatalogGeneration(nodes, node, parent);
    const { min, max } = sectorRadiusBounds(generation);
    const fixed = isRootLayer(node) || pinned != null;

    return {
      id: String(node.id),
      skillNodeId: node.id,
      x: center.x,
      y: center.y,
      vx: 0,
      vy: 0,
      fx: fixed ? center.x : undefined,
      fy: fixed ? center.y : undefined,
      sectorAngulo: resolveSectorAngle(node, nodes),
      sectorRadioMin: min,
      sectorRadioMax: max,
      radioOrbe: estimateForceLayoutOrbRadius(node.name),
      parentId: node.parentId != null ? String(node.parentId) : undefined,
      generation,
    };
  });
}

function simNodeById(nodes: SimNode[]): Map<string, SimNode> {
  return new Map(nodes.map((node) => [node.id, node]));
}

/** Modifica vx/vy in-place; la restricción angular también corrige x/y. */
export function calcularFuerzas(nodos: SimNode[]): void {
  const byId = simNodeById(nodos);

  for (const nodo of nodos) {
    if (nodo.fx !== undefined) continue;

    const parentId = nodo.parentId;
    if (!parentId) continue;

    const padre = byId.get(parentId);
    if (!padre) continue;

    const dx = padre.x - nodo.x;
    const dy = padre.y - nodo.y;
    const distancia = Math.hypot(dx, dy);
    if (distancia < 0.001) continue;

    const distanciaIdeal = Math.max(GENERATION_GAP_PX, nodo.generation * GENERATION_GAP_PX);
    const fuerza = (distancia - distanciaIdeal) * 0.03;
    nodo.vx += (dx / distancia) * fuerza;
    nodo.vy += (dy / distancia) * fuerza;
  }

  for (let i = 0; i < nodos.length; i++) {
    for (let j = i + 1; j < nodos.length; j++) {
      const nodoI = nodos[i];
      const nodoJ = nodos[j];
      if (nodoI.fx !== undefined && nodoJ.fx !== undefined) continue;

      const dx = nodoI.x - nodoJ.x;
      const dy = nodoI.y - nodoJ.y;
      const distancia = Math.hypot(dx, dy);
      const umbralRepulsion = nodoI.radioOrbe + nodoJ.radioOrbe;

      if (distancia >= umbralRepulsion || distancia <= 0) continue;

      const fuerza = (umbralRepulsion - distancia) * 0.5;
      const ux = dx / distancia;
      const uy = dy / distancia;

      if (nodoI.fx === undefined) {
        nodoI.vx += ux * fuerza;
        nodoI.vy += uy * fuerza;
      }
      if (nodoJ.fx === undefined) {
        nodoJ.vx -= ux * fuerza;
        nodoJ.vy -= uy * fuerza;
      }
    }
  }

  for (const nodo of nodos) {
    if (nodo.fx !== undefined) continue;

    const anguloActual = Math.atan2(nodo.y - MAP_CENTER.y, nodo.x - MAP_CENTER.x);
    const radio = Math.hypot(nodo.x - MAP_CENTER.x, nodo.y - MAP_CENTER.y);

    let desviacion = normalizeAngleRad(anguloActual - nodo.sectorAngulo);
    if (Math.abs(desviacion) > SECTOR_FAN_HALF_RAD) {
      const anguloCorregido = nodo.sectorAngulo + clamp(desviacion, -SECTOR_FAN_HALF_RAD, SECTOR_FAN_HALF_RAD);
      nodo.x = MAP_CENTER.x + radio * Math.cos(anguloCorregido);
      nodo.y = MAP_CENTER.y + radio * Math.sin(anguloCorregido);
      nodo.vx *= 0.3;
      nodo.vy *= 0.3;
    }

    const anguloFinal = Math.atan2(nodo.y - MAP_CENTER.y, nodo.x - MAP_CENTER.x);
    const radioFinal = Math.hypot(nodo.x - MAP_CENTER.x, nodo.y - MAP_CENTER.y);

    if (radioFinal < nodo.sectorRadioMin) {
      nodo.x = MAP_CENTER.x + nodo.sectorRadioMin * Math.cos(anguloFinal);
      nodo.y = MAP_CENTER.y + nodo.sectorRadioMin * Math.sin(anguloFinal);
    } else if (radioFinal > nodo.sectorRadioMax) {
      nodo.x = MAP_CENTER.x + nodo.sectorRadioMax * Math.cos(anguloFinal);
      nodo.y = MAP_CENTER.y + nodo.sectorRadioMax * Math.sin(anguloFinal);
    }
  }
}

export function ejecutarSimulacion(
  nodos: SimNode[],
  iteraciones = FORCE_LAYOUT_MAX_ITERATIONS
): SimNode[] {
  let temperatura = 1;

  for (let i = 0; i < iteraciones; i++) {
    calcularFuerzas(nodos);

    for (const nodo of nodos) {
      if (nodo.fx !== undefined) continue;

      nodo.vx *= FORCE_LAYOUT_FRICTION;
      nodo.vy *= FORCE_LAYOUT_FRICTION;
      nodo.x += nodo.vx * temperatura;
      nodo.y += nodo.vy * temperatura;
    }

    temperatura *= FORCE_LAYOUT_COOLING;

    const energiaTotal = nodos.reduce((sum, n) => sum + Math.abs(n.vx) + Math.abs(n.vy), 0);
    if (energiaTotal < FORCE_LAYOUT_ENERGY_THRESHOLD) break;
  }

  return nodos;
}

function layoutsOverlap(a: SimNode, b: SimNode): boolean {
  const dist = Math.hypot(a.x - b.x, a.y - b.y);
  const minDist = (a.radioOrbe + b.radioOrbe) * 0.92;
  return dist < minDist;
}

function isWithinSector(node: SimNode): boolean {
  const anguloActual = Math.atan2(node.y - MAP_CENTER.y, node.x - MAP_CENTER.x);
  const delta = Math.abs(normalizeAngleRad(anguloActual - node.sectorAngulo));
  return delta <= SECTOR_FAN_HALF_RAD + 0.02;
}

/** Valida el resultado antes de reemplazar coordenadas estáticas en el render. */
export function validateForceLayoutResult(
  simNodes: SimNode[],
  originalNodes: SkillNode[]
): boolean {
  const roots = originalNodes.filter(isRootLayer);

  for (const root of roots) {
    const sim = simNodes.find((n) => n.skillNodeId === root.id);
    if (!sim) continue;
    const orig = nodeCenterFromSkillNode(root);
    if (Math.hypot(sim.x - orig.x, sim.y - orig.y) > 1) return false;
  }

  const freeNodes = simNodes.filter((n) => n.fx === undefined);
  for (const node of freeNodes) {
    if (!isWithinSector(node)) return false;
  }

  for (let i = 0; i < freeNodes.length; i++) {
    for (let j = i + 1; j < freeNodes.length; j++) {
      if (layoutsOverlap(freeNodes[i], freeNodes[j])) return false;
    }
  }

  return true;
}

export function simResultToPositionMap(simNodes: SimNode[]): Record<number, { posX: number; posY: number }> {
  const map: Record<number, { posX: number; posY: number }> = {};
  for (const sim of simNodes) {
    if (sim.fx !== undefined) continue;
    map[sim.skillNodeId] = skillPosFromCenter(sim.x, sim.y);
  }
  return map;
}

export function computeForceDirectedLayout(
  nodes: SkillNode[],
  pinnedCenters?: ReadonlyMap<number, { x: number; y: number }>
): Record<number, { posX: number; posY: number }> | null {
  if (!ENABLE_FORCE_DIRECTED_LAYOUT || nodes.length === 0) return null;

  const simNodes = buildSimNodesFromSkillNodes(nodes, pinnedCenters);
  if (simNodes.length === 0) return null;

  ejecutarSimulacion(simNodes, FORCE_LAYOUT_MAX_ITERATIONS);
  if (validateForceLayoutResult(simNodes, nodes)) {
    return simResultToPositionMap(simNodes);
  }

  ejecutarSimulacion(simNodes, FORCE_LAYOUT_MAX_ITERATIONS + 60);
  if (validateForceLayoutResult(simNodes, nodes)) {
    return simResultToPositionMap(simNodes);
  }

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn('[ForceLayout] Validación fallida — se conservan coordenadas estáticas.');
  }
  return null;
}

export function mergeNodeWithDisplayPosition(
  node: SkillNode,
  forceLayout: Record<number, { posX: number; posY: number }>,
  manualOverrides: Record<number, { posX: number; posY: number }>
): SkillNode {
  const manual = manualOverrides[node.id];
  if (manual) return { ...node, ...manual };

  const forced = forceLayout[node.id];
  if (forced) return { ...node, ...forced };

  return node;
}
