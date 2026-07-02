import { MacroArea, SkillNode, User } from '@/src/types';
import { computeDecayRatio } from '@/src/utils/decayRatio';
import { isDailyVerifiedToday } from '@/src/utils/dailyVerification';
import { isShadowLayerNode } from '@/src/utils/shadowNodePlacement';

const ALL_AREAS: MacroArea[] = [
  'physical',
  'intellectual',
  'mental_emotional',
  'productive',
];

export const MACRO_AREA_LABELS: Record<MacroArea, string> = {
  physical: 'Física',
  intellectual: 'Intelectual',
  mental_emotional: 'Mental/Emocional',
  productive: 'Productiva',
};

export interface ProgressStats {
  /** Compromiso Hoy (%) — barra azul */
  activeProgress: number;
  /** Árbol Explorado (%) — barra dorada */
  globalProgress: number;
  compromisoChecksHoy: number;
  compromisoActivados: number;
  arbolActivados: number;
  arbolTotal: number;
  forgetPercent: number;
  lowAttentionAreas: MacroArea[];
  areaLevels: Record<MacroArea, number>;
}

function clampPercent(value: number): number {
  return Math.round(Math.min(100, Math.max(0, value)));
}

function activeCustomNodes(nodes: SkillNode[]): SkillNode[] {
  return nodes.filter((n) => n.layer === 'custom' && !isShadowLayerNode(n));
}

/** Nodo que el usuario activó alguna vez (check, XP, forja o práctica). */
export function esNodoActivado(node: SkillNode): boolean {
  if (node.isDeleted || node.id <= 0 || node.layer === 'dormant' || isShadowLayerNode(node)) {
    return false;
  }
  if (node.layer === 'wildcard') return false;
  if (node.layer === 'root' || node.layer === 'guide') {
    return (
      node.level > 1 ||
      Boolean(node.dailyVerifiedAt) ||
      Boolean(node.lastPracticeAt)
    );
  }
  if (node.layer === 'custom') {
    return true;
  }
  return (
    node.xp > 0 ||
    node.level > 1 ||
    Boolean(node.dailyVerifiedAt) ||
    Boolean(node.lastPracticeAt)
  );
}

export function userActivatedNodes(nodes: SkillNode[]): SkillNode[] {
  return nodes.filter(esNodoActivado);
}

export function computeAreaLevelsFromNodes(nodes: SkillNode[]): Record<MacroArea, number> {
  const levels: Record<MacroArea, number> = {
    physical: 0,
    intellectual: 0,
    mental_emotional: 0,
    productive: 0,
  };

  for (const node of nodes) {
    if (node.layer === 'dormant') continue;
    levels[node.macroArea] += node.level;
  }

  return levels;
}

/** Compromiso Hoy: checks de hoy / nodos activados. */
export function computeCompromisoHoy(nodes: SkillNode[], now: Date = new Date()): number {
  const nodosActivados = userActivatedNodes(nodes);
  if (nodosActivados.length === 0) return 0;

  const checksHoy = nodosActivados.filter((n) => isDailyVerifiedToday(n, now)).length;
  return Math.round((checksHoy / nodosActivados.length) * 100);
}

/** Nodos que forman el árbol explorable (catálogo + raíces + custom; sin sombra virtual). */
export function nodesInArbolExploradoPool(nodes: SkillNode[]): SkillNode[] {
  return nodes.filter(
    (n) =>
      !n.isDeleted &&
      n.id > 0 &&
      n.layer !== 'dormant' &&
      n.layer !== 'wildcard' &&
      !isShadowLayerNode(n)
  );
}

/** Árbol Explorado: nodos con práctica/check/adopción / pool explorable del árbol. */
export function computeArbolExplorado(nodes: SkillNode[]): number {
  const pool = nodesInArbolExploradoPool(nodes);
  if (pool.length === 0) return 0;

  const nodosActivados = pool.filter(esNodoActivado);
  return Math.round((nodosActivados.length / pool.length) * 100);
}

/** @deprecated Usar computeCompromisoHoy */
export const computeActiveProgress = computeCompromisoHoy;

/** @deprecated Usar computeArbolExplorado */
export function computeGlobalProgress(_activatedNodes: SkillNode[], allNodes?: SkillNode[]): number {
  return computeArbolExplorado(allNodes ?? _activatedNodes);
}

function computeForgetPercent(
  customNodes: SkillNode[],
  user: User,
  now: Date
): number {
  if (customNodes.length === 0) return 0;

  const forgetScores = customNodes.map((node) => {
    const retention = computeDecayRatio(node, user, now);
    return (1 - retention) * 100;
  });

  return forgetScores.reduce((sum, v) => sum + v, 0) / forgetScores.length;
}

function computeLowAttentionAreas(
  nodes: SkillNode[],
  user: User,
  areaLevels: Record<MacroArea, number>,
  now: Date
): MacroArea[] {
  const custom = activeCustomNodes(nodes);
  const maxLevel = Math.max(...ALL_AREAS.map((a) => areaLevels[a]), 1);

  return ALL_AREAS.filter((area) => {
    const areaCustom = custom.filter((n) => n.macroArea === area);
    const levelShare = areaLevels[area] / maxLevel;

    if (areaCustom.length === 0) return true;

    const avgRetention =
      areaCustom.reduce((sum, n) => sum + computeDecayRatio(n, user, now), 0) /
      areaCustom.length;

    return avgRetention < 0.5 || levelShare < 0.35;
  });
}

function logProgressDiagnostics(nodes: SkillNode[], now: Date): void {
  const nodosActivados = userActivatedNodes(nodes);
  const arbolPool = nodesInArbolExploradoPool(nodes);
  const hoy = now.toDateString();
  const checksHoy = nodosActivados.filter(
    (n) => n.dailyVerifiedAt && new Date(n.dailyVerifiedAt).toDateString() === hoy
  ).length;
  const arbolActivados = arbolPool.filter(esNodoActivado).length;

  const compromiso = computeCompromisoHoy(nodes, now);
  const arbol = computeArbolExplorado(nodes);

  console.log('COMPROMISO HOY:', compromiso, '%');
  console.log('  checks hoy:', checksHoy, '/ nodos activados:', nodosActivados.length);
  console.log('ÁRBOL EXPLORADO:', arbol, '%');
  console.log('  activados:', arbolActivados, '/ total árbol:', arbolPool.length);
}

export function computeProgressStats(
  nodes: SkillNode[],
  user: User | null,
  now: Date = new Date()
): ProgressStats {
  const areaLevels = computeAreaLevelsFromNodes(nodes);
  const customNodes = activeCustomNodes(nodes);
  const nodosActivados = userActivatedNodes(nodes);
  const arbolPool = nodesInArbolExploradoPool(nodes);
  const hoy = now.toDateString();
  const compromisoChecksHoy = nodosActivados.filter(
    (n) => n.dailyVerifiedAt && new Date(n.dailyVerifiedAt).toDateString() === hoy
  ).length;
  const arbolActivados = arbolPool.filter(esNodoActivado).length;

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    logProgressDiagnostics(nodes, now);
  }

  const compromisoActivados = nodosActivados.length;
  const arbolTotal = arbolPool.length;

  if (!user) {
    return {
      activeProgress: 0,
      globalProgress: clampPercent(computeArbolExplorado(nodes)),
      compromisoChecksHoy: 0,
      compromisoActivados,
      arbolActivados,
      arbolTotal,
      forgetPercent: 0,
      lowAttentionAreas: ALL_AREAS,
      areaLevels,
    };
  }

  const activeProgress = clampPercent(computeCompromisoHoy(nodes, now));
  const globalProgress = clampPercent(computeArbolExplorado(nodes));
  const forgetPercent = clampPercent(computeForgetPercent(customNodes, user, now));
  const lowAttentionAreas = computeLowAttentionAreas(nodes, user, areaLevels, now);

  return {
    activeProgress,
    globalProgress,
    compromisoChecksHoy,
    compromisoActivados,
    arbolActivados,
    arbolTotal,
    forgetPercent,
    lowAttentionAreas,
    areaLevels,
  };
}

export const STAT_EXPLANATIONS = {
  active:
    'Porcentaje de tus habilidades activadas con las que practicaste hoy. Vuelve a 0% cada mañana.',
  activeDetail: (checks: number, total: number) =>
    `${checks} de ${total} habilidades practicadas hoy`,
  global:
    'Porcentaje del catálogo que descubriste con XP, check diario o adopción. Solo tocar el nodo no cuenta.',
  globalDetail: (activated: number, total: number) =>
    `${activated} de ${total} habilidades con práctica o adopción`,
  forget:
    'Porcentaje de oxidación acumulada. Aumenta cuando dejas de practicar; baja registrando XP en tus nodos custom.',
} as const;
