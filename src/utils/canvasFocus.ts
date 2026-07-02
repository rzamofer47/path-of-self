import { SkillNode } from '@/src/types';
import { CANVAS_ZOOM, clampZoom, computeFitScale } from '@/src/utils/canvasZoom';
import { resolveVertienteId } from '@/src/config/nenConfig';
import { CANVAS_HEIGHT, CANVAS_WIDTH, ORB_SIZE, getNodeCenter } from '@/src/utils/treeLayout';
import { getDecayState } from '@/src/utils/visualDecay';

const RECENT_CHECK_DAYS = 3;
const MIN_TOUCH_ORB_PX = 44;
const FOCUS_PADDING_PX = 100;

export interface CanvasTransform {
  scale: number;
  translateX: number;
  translateY: number;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getNodesWithRecentCheck(
  nodes: SkillNode[],
  now: Date = new Date()
): SkillNode[] {
  const cutoff = startOfDay(now);
  cutoff.setDate(cutoff.getDate() - RECENT_CHECK_DAYS);

  return nodes.filter((node) => {
    if (node.isDeleted || node.id <= 0 || !node.dailyVerifiedAt) return false;
    const checked = new Date(node.dailyVerifiedAt);
    return !Number.isNaN(checked.getTime()) && checked >= cutoff;
  });
}

export function getNodesInDecay(nodes: SkillNode[], now: Date = new Date()): SkillNode[] {
  return nodes.filter((node) => {
    if (node.isDeleted || node.id <= 0) return false;
    const state = getDecayState(node, now);
    return state === 'cooling' || state === 'cold';
  });
}

/** Rama (vertiente) con más XP acumulado; devuelve nodos de esa vertiente. */
export function getHighestXpVertienteNodes(nodes: SkillNode[]): SkillNode[] {
  const xpByVertiente = new Map<string, number>();
  const nodesByVertiente = new Map<string, SkillNode[]>();

  for (const node of nodes) {
    if (node.isDeleted || node.id <= 0) continue;
    const v = resolveVertienteId(node, nodes);
    if (!v) continue;
    xpByVertiente.set(v, (xpByVertiente.get(v) ?? 0) + node.xp);
    const list = nodesByVertiente.get(v) ?? [];
    list.push(node);
    nodesByVertiente.set(v, list);
  }

  let best: string | null = null;
  let bestXp = -1;
  for (const [v, xp] of xpByVertiente) {
    if (xp > bestXp) {
      bestXp = xp;
      best = v;
    }
  }

  return best ? (nodesByVertiente.get(best) ?? []) : [];
}

export function pickFocusDayNodes(nodes: SkillNode[], now: Date = new Date()): SkillNode[] {
  const recent = getNodesWithRecentCheck(nodes, now);
  if (recent.length > 0) return recent;
  const branch = getHighestXpVertienteNodes(nodes);
  if (branch.length > 0) return branch;
  return nodes.filter((n) => !n.isDeleted && n.id > 0);
}

function computeBounds(nodes: SkillNode[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const c = getNodeCenter(node);
    minX = Math.min(minX, c.x - ORB_SIZE / 2);
    maxX = Math.max(maxX, c.x + ORB_SIZE / 2);
    minY = Math.min(minY, c.y - ORB_SIZE / 2);
    maxY = Math.max(maxY, c.y + ORB_SIZE / 2);
  }

  if (!Number.isFinite(minX)) {
    return {
      minX: CANVAS_WIDTH / 2 - 50,
      maxX: CANVAS_WIDTH / 2 + 50,
      minY: CANVAS_HEIGHT / 2 - 50,
      maxY: CANVAS_HEIGHT / 2 + 50,
    };
  }

  return { minX, maxX, minY, maxY };
}

export function computeFocusTransform(
  focusNodes: SkillNode[],
  viewportWidth: number,
  viewportHeight: number,
  minScale: number
): CanvasTransform {
  const bounds = computeBounds(focusNodes);
  const width = bounds.maxX - bounds.minX + FOCUS_PADDING_PX * 2;
  const height = bounds.maxY - bounds.minY + FOCUS_PADDING_PX * 2;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  const fitW = viewportWidth / width;
  const fitH = viewportHeight / height;
  const fitScale = Math.min(fitW, fitH);
  const minOrbScale = MIN_TOUCH_ORB_PX / ORB_SIZE;
  const targetScale = clampZoom(
    Math.max(fitScale, minOrbScale),
    minScale,
    CANVAS_ZOOM.MAX
  );

  return {
    scale: targetScale,
    translateX: viewportWidth / 2 - centerX * targetScale,
    translateY: viewportHeight / 2 - centerY * targetScale,
  };
}

export function computeFullCanvasTransform(
  viewportWidth: number,
  viewportHeight: number,
  minScale: number,
  defaultScale: number
): CanvasTransform {
  const fitScale = computeFitScale(viewportWidth, viewportHeight);
  const scale = clampZoom(defaultScale || fitScale, minScale, CANVAS_ZOOM.MAX);
  return {
    scale,
    translateX: (viewportWidth - CANVAS_WIDTH * scale) / 2,
    translateY: (viewportHeight - CANVAS_HEIGHT * scale) / 2,
  };
}
