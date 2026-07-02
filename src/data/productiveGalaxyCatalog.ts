import { CatalogNodeSeed } from '@/src/data/skillCatalogSeeds';
import { NEN_MOTHER_SLUG_BY_ID } from '@/src/config/nenMotherRoots';
import { MacroArea, NodeColorRole, NodeType } from '@/src/types';

export type ProductiveBranch = 'coding' | 'writing';

export interface ProductiveGalaxyNodeDef {
  slug: string;
  name: string;
  parentSlug: string;
  generation: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  branch: ProductiveBranch;
  youtubeUrl: string;
  colorRole?: NodeColorRole;
}

const BRANCH_ROOT_SLUG: Record<ProductiveBranch, string> = {
  coding: NEN_MOTHER_SLUG_BY_ID.manipulation,
  writing: NEN_MOTHER_SLUG_BY_ID.emission,
};

interface BranchNodeDef {
  slug: string;
  name: string;
  youtubeQuery?: string;
  colorRole?: NodeColorRole;
}

function ytSearch(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

function buildBranchNodes(
  branch: ProductiveBranch,
  vertienteName: string,
  generations: BranchNodeDef[][]
): ProductiveGalaxyNodeDef[] {
  const vertSlug = `discipline_productive_${branch}`;
  const nodes: ProductiveGalaxyNodeDef[] = [
    {
      slug: vertSlug,
      name: vertienteName,
      parentSlug: BRANCH_ROOT_SLUG[branch],
      generation: 0,
      branch,
      youtubeUrl: '',
      colorRole: 'standard',
    },
  ];

  let previousSlugs = [vertSlug];

  generations.forEach((generationNodes, generationIndex) => {
    const generation = (generationIndex + 1) as ProductiveGalaxyNodeDef['generation'];
    const currentSlugs: string[] = [];

    generationNodes.forEach((node, slotIndex) => {
      const parentSlug =
        generation === 1 ? vertSlug : previousSlugs[slotIndex % previousSlugs.length];

      currentSlugs.push(node.slug);
      nodes.push({
        slug: node.slug,
        name: node.name,
        parentSlug,
        generation,
        branch,
        youtubeUrl: node.youtubeQuery ? ytSearch(node.youtubeQuery) : '',
        colorRole: node.colorRole ?? 'standard',
      });
    });

    previousSlugs = currentSlugs;
  });

  return nodes;
}

const CODING_GENERATIONS: BranchNodeDef[][] = [
  [
    {
      slug: 'prod_code_terminal_git',
      name: 'Dominio de Terminal y Git',
      youtubeQuery: 'git commits ramas push pull tutorial español',
    },
    {
      slug: 'prod_code_env_setup',
      name: 'Configuración de Entorno de Desarrollo',
      youtubeQuery: 'configurar nodejs vscode variables entorno español',
    },
    {
      slug: 'prod_code_debugging',
      name: 'Lectura de Errores y Debugging Básico',
      youtubeQuery: 'debugging javascript errores consola español',
    },
  ],
  [
    {
      slug: 'prod_code_rn_fundamentals',
      name: 'React Native Fundamentos',
      youtubeQuery: 'react native componentes props estado español',
    },
    {
      slug: 'prod_code_expo_eas',
      name: 'Expo Setup y EAS Build',
      youtubeQuery: 'expo eas build tutorial español',
    },
    {
      slug: 'prod_code_expo_router',
      name: 'Navegación con Expo Router',
      youtubeQuery: 'expo router navegación tutorial español',
    },
  ],
  [
    {
      slug: 'prod_code_supabase',
      name: 'Supabase (tablas, autenticación, RLS)',
      youtubeQuery: 'supabase autenticación RLS español',
    },
    {
      slug: 'prod_code_sqlite',
      name: 'SQLite Local (esquema, queries, migraciones)',
      youtubeQuery: 'sqlite react native expo español',
    },
    {
      slug: 'prod_code_rest_apis',
      name: 'APIs REST (fetch, respuestas, errores)',
      youtubeQuery: 'fetch api rest javascript español',
    },
  ],
  [
    {
      slug: 'prod_code_prompting',
      name: 'Prompting Efectivo para Código',
      youtubeQuery: 'prompt engineering código cursor claude español',
    },
    {
      slug: 'prod_code_agents_roo',
      name: 'Agentes y Workflows con Roo Code',
    },
    {
      slug: 'prod_code_ai_apis',
      name: 'Integración de APIs de IA',
      youtubeQuery: 'anthropic api integración javascript español',
    },
  ],
  [
    {
      slug: 'prod_code_ia_architect',
      name: 'Arquitecto de Producto IA',
      youtubeQuery: 'full stack feature supabase react native español',
      colorRole: 'shared',
    },
  ],
  [
    {
      slug: 'prod_code_app_published',
      name: 'App Publicada en Producción',
      youtubeQuery: 'publicar app play store expo español',
      colorRole: 'critical',
    },
  ],
];

const WRITING_GENERATIONS: BranchNodeDef[][] = [
  [
    {
      slug: 'prod_write_research',
      name: 'Investigación de Tema',
      youtubeQuery: 'investigación documental verificación fuentes español',
    },
    {
      slug: 'prod_write_narrative',
      name: 'Estructura Narrativa del Guión',
      youtubeQuery: 'estructura guión youtube documental español',
    },
    {
      slug: 'prod_write_script_pacing',
      name: 'Guión con Ritmo de Locución',
      youtubeQuery: 'escribir guión locución youtube español',
    },
  ],
  [
    {
      slug: 'prod_write_elevenlabs',
      name: 'Locución con ElevenLabs',
      youtubeQuery: 'elevenlabs locución voz español tutorial',
    },
    {
      slug: 'prod_write_midjourney',
      name: 'Generación de Imágenes Atmosféricas',
      youtubeQuery: 'midjourney imágenes atmósfera sin personas español',
    },
    {
      slug: 'prod_write_suno',
      name: 'Música y Atmósfera (Suno)',
      youtubeQuery: 'suno ai música ambiente tutorial español',
    },
  ],
  [
    {
      slug: 'prod_write_runway',
      name: 'Clips de Video Cortos (Runway ML)',
      youtubeQuery: 'runway ml video corto tutorial español',
    },
    {
      slug: 'prod_write_premiere',
      name: 'Edición en Premiere Pro',
      youtubeQuery: 'premiere pro montaje documental español',
    },
    {
      slug: 'prod_write_subtitles',
      name: 'Subtítulos y Gráficos',
      youtubeQuery: 'subtítulos premiere pro youtube español',
    },
  ],
  [
    {
      slug: 'prod_write_seo_publish',
      name: 'Publicación Optimizada (SEO)',
      youtubeQuery: 'seo youtube título descripción tags español',
    },
    {
      slug: 'prod_write_instagram_reel',
      name: 'Reel de Instagram',
      youtubeQuery: 'reel instagram vertical edición español',
    },
    {
      slug: 'prod_write_metrics',
      name: 'Análisis de Métricas',
      youtubeQuery: 'analíticas youtube retención CTR español',
    },
  ],
  [
    {
      slug: 'prod_write_pipeline',
      name: 'Pipeline de Producción Automatizado',
      youtubeQuery: 'workflow producción video youtube español',
      colorRole: 'shared',
    },
  ],
  [
    {
      slug: 'prod_write_monetized',
      name: 'Canal Monetizado Activo',
      youtubeQuery: 'monetización youtube requisitos español',
      colorRole: 'critical',
    },
  ],
];

export const PRODUCTIVE_GALAXY_NODES: ProductiveGalaxyNodeDef[] = [
  ...buildBranchNodes(
    'coding',
    'Desarrollo de Software e IA',
    CODING_GENERATIONS
  ),
  ...buildBranchNodes(
    'writing',
    'Creación de Contenido Digital',
    WRITING_GENERATIONS
  ),
];

export function buildProductiveGalaxyCatalogSeeds(): CatalogNodeSeed[] {
  return PRODUCTIVE_GALAXY_NODES.map((node) => ({
    slug: node.slug,
    name: node.name,
    type: 'intellectual' as NodeType,
    macroArea: 'productive' as MacroArea,
    parentSlug: node.parentSlug,
    generation: node.generation,
    posX: 0,
    posY: 0,
    youtubeUrl: node.youtubeUrl || null,
    colorRole: node.colorRole ?? 'standard',
  }));
}

/** Slugs legacy del catálogo productivo anterior. */
export const LEGACY_PRODUCTIVE_LOCKED_SLUGS = [
  'discipline_productive_design',
  'disc_code_react',
  'disc_code_typescript',
  'disc_code_git',
  'disc_code_algoritmos',
  'disc_code_proyecto',
  'disc_code_refactor',
  'disc_write_blog',
  'disc_write_copy',
  'disc_write_newsletter',
  'disc_write_borrador',
  'disc_write_edicion',
  'disc_write_publicacion',
  'disc_design_figma',
  'disc_design_ui',
  'disc_design_prototype',
  'disc_design_wireframe',
  'disc_design_sistema',
  'disc_design_prototipo',
];
