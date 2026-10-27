import { MacroArea, NodeColorRole, NodeType } from '@/src/types';

export interface CatalogBranchNodeDef {
  slug: string;
  name: string;
  youtubeQuery: string;
  colorRole?: NodeColorRole;
}

export interface LinearGalaxyNodeDef {
  slug: string;
  name: string;
  parentSlug: string;
  generation: 0 | 1 | 2 | 3 | 4 | 5;
  branch: string;
  youtubeUrl: string;
  colorRole?: NodeColorRole;
  prerequisiteSlug?: string;
  macroArea: MacroArea;
  type: NodeType;
}

function ytSearch(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

/** Cadena lineal hub → G1 → G2 … con prerequisiteSlug y parentSlug jerárquico. */
export function buildLinearGalaxyBranch(
  branch: string,
  hubSlug: string,
  hubName: string,
  hubQuery: string,
  rootSlug: string,
  macroArea: MacroArea,
  type: NodeType,
  generations: CatalogBranchNodeDef[][]
): LinearGalaxyNodeDef[] {
  const nodes: LinearGalaxyNodeDef[] = [
    {
      slug: hubSlug,
      name: hubName,
      parentSlug: rootSlug,
      generation: 0,
      branch,
      youtubeUrl: ytSearch(hubQuery),
      colorRole: 'standard',
      macroArea,
      type,
    },
  ];

  let chainPrevSlug = hubSlug;

  generations.forEach((generationNodes, generationIndex) => {
    const generation = (generationIndex + 1) as LinearGalaxyNodeDef['generation'];

    generationNodes.forEach((node) => {
      const parentSlug = generation === 1 ? hubSlug : chainPrevSlug;
      const prerequisiteSlug = generation > 1 ? chainPrevSlug : undefined;

      nodes.push({
        slug: node.slug,
        name: node.name,
        parentSlug,
        generation,
        branch,
        youtubeUrl: ytSearch(node.youtubeQuery),
        colorRole: node.colorRole ?? 'standard',
        prerequisiteSlug,
        macroArea,
        type,
      });

      chainPrevSlug = node.slug;
    });
  });

  return nodes;
}

export function toCatalogSeeds(nodes: LinearGalaxyNodeDef[]) {
  return nodes.map((node) => ({
    slug: node.slug,
    name: node.name,
    type: node.type,
    macroArea: node.macroArea,
    parentSlug: node.parentSlug,
    generation: node.generation,
    posX: 0,
    posY: 0,
    youtubeUrl: node.youtubeUrl,
    colorRole: node.colorRole ?? 'standard',
    prerequisiteSlug: node.prerequisiteSlug,
  }));
}
