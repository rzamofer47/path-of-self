import { MacroArea, SkillNode } from '@/src/types';
import { getNenRootPalette, type NodeOrbPalette } from '@/src/config/nenMotherRoots';
import {
  getNenPaletaForNode,
  nenPaletaToOrbPalette,
  NEN_PALETA,
  resolveNenAxisId,
} from '@/src/config/nenConfig';
import { isWildcardNode } from '@/src/utils/wildcardNodes';

export type { NodeOrbPalette };

export const HUE_SHIFT_STEP = 20;

/**
 * Matiz base HSL por macro-área — identidad cromática uniforme en todo el árbol.
 * physical → verdes | intellectual → azules | productive → dorados | mental_emotional → morados
 */
export const ROOT_BASE_HUE: Record<MacroArea, number> = {
  physical: 128,
  intellectual: 210,
  productive: 44,
  mental_emotional: 278,
};

/** Ámbar — nodo comodín sin configurar. */
export const WILDCARD_PALETTE: NodeOrbPalette = {
  border: '#c9a227',
  glow: '#e8c547',
  accentSecondary: '#8a7020',
};

const WILDCARD_PALETTE_MUTED: NodeOrbPalette = {
  border: '#7a6530',
  glow: '#9a8440',
  accentSecondary: '#4a4020',
};

interface Hsl {
  h: number;
  s: number;
  l: number;
}

export function isRootLayer(node: Pick<SkillNode, 'layer'>): boolean {
  return node.layer === 'root' || node.layer === 'guide';
}

export function hexToHsl(hex: string): Hsl {
  const normalized = hex.replace('#', '');
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized;

  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: l * 100 };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    default:
      h = ((r - g) / d + 4) / 6;
      break;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToHex(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360;
  const ss = Math.min(100, Math.max(0, s)) / 100;
  const ll = Math.min(100, Math.max(0, l)) / 100;

  if (ss === 0) {
    const v = Math.round(ll * 255);
    const hex = v.toString(16).padStart(2, '0');
    return `#${hex}${hex}${hex}`;
  }

  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
  const p = 2 * ll - q;
  const hk = hh / 360;

  const toRgb = (t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const r = Math.round(toRgb(hk + 1 / 3) * 255);
  const g = Math.round(toRgb(hk) * 255);
  const b = Math.round(toRgb(hk - 1 / 3) * 255);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Color base del nodo raíz desde su Hue HSL fijo o paleta Nen. */
export function getRootBaseHex(node: Pick<SkillNode, 'macroArea' | 'slug'>): string {
  const nenPalette = getNenRootPalette(node.slug, true);
  if (nenPalette) return nenPalette.border;
  return getMacroAreaPalette(node.macroArea, true).border;
}

/** Paleta por sector: brillante (activo) o tenue (inactivo). */
export function getMacroAreaPalette(macroArea: MacroArea, active: boolean): NodeOrbPalette {
  const h = ROOT_BASE_HUE[macroArea];

  if (active) {
    return {
      border: hslToHex(h, 88, 54),
      glow: hslToHex(h, 96, 68),
      accentSecondary: hslToHex(h, 62, 26),
    };
  }

  return {
    border: hslToHex(h, 26, 34),
    glow: hslToHex(h, 20, 28),
    accentSecondary: hslToHex(h, 16, 22),
  };
}

export function resolveParentNode(node: SkillNode, nodes: SkillNode[]): SkillNode | null {
  if (node.parentId != null) {
    const parent = nodes.find((n) => n.id === node.parentId);
    if (parent) return parent;
  }
  if (node.layer === 'custom' || node.layer === 'guide' || node.layer === 'locked') {
    return nodes.find((n) => isRootLayer(n) && n.macroArea === node.macroArea) ?? null;
  }
  return null;
}

export function getSiblingHueShift(node: SkillNode, nodes: SkillNode[]): number {
  const parent = resolveParentNode(node, nodes);
  if (!parent || isRootLayer(node)) return 0;

  const siblings = nodes
    .filter((n) => n.layer === 'custom' && resolveParentNode(n, nodes)?.id === parent.id)
    .sort((a, b) => a.id - b.id);

  const idx = siblings.findIndex((s) => s.id === node.id);
  if (idx <= 0) return 0;

  const slot = Math.ceil(idx / 2);
  const sign = idx % 2 === 1 ? 1 : -1;
  return sign * slot * HUE_SHIFT_STEP;
}

export function getNodeOrbPalette(
  node: SkillNode,
  nodes: SkillNode[],
  theme: { secondary: string; accent: string },
  active = true
): NodeOrbPalette {
  if (isWildcardNode(node)) {
    return active ? WILDCARD_PALETTE : WILDCARD_PALETTE_MUTED;
  }

  if (isRootLayer(node)) {
    const axisEntry = getNenPaletaForNode(node, nodes, active);
    if (axisEntry) return nenPaletaToOrbPalette(axisEntry, active);
    const nenPalette = getNenRootPalette(node.slug, active);
    if (nenPalette) return nenPalette;
  }

  if (node.macroArea) {
    return getMacroAreaPalette(node.macroArea, active);
  }

  return {
    border: node.type === 'physical' ? theme.secondary : theme.accent,
    glow: node.type === 'physical' ? theme.secondary : theme.accent,
    accentSecondary: node.type === 'physical' ? theme.secondary : theme.accent,
  };
}

export function getConnectionGradientStops(
  edge: { fromId: number; toId: number },
  nodes: SkillNode[],
  theme: { secondary: string; accent: string }
): [string, string, string] {
  const child = nodes.find((n) => n.id === edge.toId);
  const parent = nodes.find((n) => n.id === edge.fromId);
  if (!child) return ['#88ddff', theme.accent, '#2a6cb8'];

  const childPalette = getNodeOrbPalette(child, nodes, theme, true);

  if (parent && isRootLayer(parent)) {
    const axis = resolveNenAxisId(parent, nodes);
    if (axis) {
      const c = NEN_PALETA[axis].color;
      return [c, childPalette.border, childPalette.accentSecondary];
    }
    const parentPalette = getNodeOrbPalette(parent, nodes, theme, true);
    return [parentPalette.glow, childPalette.border, childPalette.accentSecondary];
  }

  return [childPalette.glow, childPalette.border, childPalette.accentSecondary];
}

/** @deprecated Usar getNodeOrbPalette */
export function getOrbBorderColor(
  node: SkillNode,
  theme: { secondary: string; accent: string },
  nodes?: SkillNode[]
): string {
  if (nodes) {
    return getNodeOrbPalette(node, nodes, theme).border;
  }
  if (isRootLayer(node)) return getRootBaseHex(node);
  return node.type === 'physical' ? theme.secondary : theme.accent;
}

/** @deprecated Usar getRootBaseHex */
export function getGuideBaseHex(node: SkillNode): string {
  return getRootBaseHex(node);
}
