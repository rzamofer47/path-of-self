import {
  NEN_MOTHER_ROOTS,
  getNenMotherRootPosition,
  type NenMotherRootDef,
} from '@/src/config/nenMotherRoots';
import { MacroArea, NodeType } from '@/src/types';

/**
 * Semillas de los 6 Nodos Madre (hexágono Nen central, lienzo 2400×2400).
 * Posiciones: ROOT_ORBIT_RADIUS (220px) en vértices de hexágono regular a 60°.
 * Metadatos completos (nombre, paleta, vertientes): nenMotherRoots.ts + nenConfig.ts.
 */

export interface RootSeed {
  slug: string;
  name: string;
  type: NodeType;
  macroArea: MacroArea;
  posX: number;
  posY: number;
}

function toRootSeed(def: NenMotherRootDef): RootSeed {
  const pos = getNenMotherRootPosition(def.id);
  return {
    slug: def.slug,
    name: def.name,
    type: def.type,
    macroArea: def.macroArea,
    posX: pos.posX,
    posY: pos.posY,
  };
}

/** 6 nodos madre Nen — vértices del hexágono central. */
export const ROOT_SEEDS: readonly RootSeed[] = NEN_MOTHER_ROOTS.map(toRootSeed);

/** @deprecated Usar ROOT_SEEDS */
export const GUIDE_SEEDS = ROOT_SEEDS;
