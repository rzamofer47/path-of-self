import { CatalogNodeSeed } from '@/src/data/skillCatalogSeeds';
import { NEN_MOTHER_SLUG_BY_ID } from '@/src/config/nenMotherRoots';
import { MacroArea, NodeColorRole, NodeType } from '@/src/types';

export type MentalBranch = 'nervioso' | 'enfoque' | 'lectura';

export type CatalogColorRole = NodeColorRole;

const BRANCH_ROOT_SLUG: Record<MentalBranch, string> = {
  nervioso: NEN_MOTHER_SLUG_BY_ID.specialization,
  enfoque: NEN_MOTHER_SLUG_BY_ID.materialization,
  lectura: NEN_MOTHER_SLUG_BY_ID.specialization,
};

export interface MentalGalaxyNodeDef {
  slug: string;
  name: string;
  parentSlug: string;
  generation: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  branch: MentalBranch;
  youtubeUrl: string;
  colorRole?: CatalogColorRole;
}

function ytSearch(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

interface BranchNodeDef {
  slug: string;
  name: string;
  youtubeQuery: string;
  colorRole?: CatalogColorRole;
}

function buildBranchNodes(
  branch: MentalBranch,
  vertienteName: string,
  vertienteQuery: string,
  generations: BranchNodeDef[][]
): MentalGalaxyNodeDef[] {
  const vertSlug = `discipline_mental_emotional_${branch}`;
  const nodes: MentalGalaxyNodeDef[] = [
    {
      slug: vertSlug,
      name: vertienteName,
      parentSlug: BRANCH_ROOT_SLUG[branch],
      generation: 0,
      branch,
      youtubeUrl: ytSearch(vertienteQuery),
      colorRole: 'standard',
    },
  ];

  let previousSlugs = [vertSlug];

  generations.forEach((generationNodes, generationIndex) => {
    const generation = (generationIndex + 1) as MentalGalaxyNodeDef['generation'];
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
        youtubeUrl: ytSearch(node.youtubeQuery),
        colorRole: node.colorRole ?? 'standard',
      });
    });

    previousSlugs = currentSlugs;
  });

  return nodes;
}

const NERVIOSO_GENERATIONS: BranchNodeDef[][] = [
  [
    {
      slug: 'men_nerv_respiracion_fundamentos',
      name: 'Respiración Consciente Fundamentos',
      youtubeQuery: 'respiración consciente fundamentos español',
    },
  ],
  [
    {
      slug: 'men_nerv_box_breathing',
      name: 'Respiración Cuadrada (Box Breathing)',
      youtubeQuery: 'box breathing respiración cuadrada español',
    },
    {
      slug: 'men_nerv_478',
      name: 'Técnica 4-7-8',
      youtubeQuery: 'técnica respiración 4-7-8 español',
    },
    {
      slug: 'men_nerv_diafragmatica',
      name: 'Respiración Diafragmática',
      youtubeQuery: 'respiración diafragmática técnica español',
    },
  ],
  [
    {
      slug: 'men_nerv_body_scan',
      name: 'Escaneo Corporal Pasivo',
      youtubeQuery: 'body scan meditación escaneo corporal español',
    },
    {
      slug: 'men_nerv_jacobson',
      name: 'Relajación Progresiva de Jacobson',
      youtubeQuery: 'relajación progresiva Jacobson español',
    },
  ],
  [
    {
      slug: 'men_nerv_duchas_frias',
      name: 'Exposición Controlada al Estrés (Duchas Frías)',
      youtubeQuery: 'duchas frías exposición al estrés biohacking español',
    },
  ],
  [
    {
      slug: 'men_nerv_anclaje_judo',
      name: 'Anclaje Post-Judo (Respiración Consciente + Reiho)',
      youtubeQuery: 'judo reiho respiración consciente recuperación español',
      colorRole: 'shared',
    },
    {
      slug: 'men_nerv_alert_coding',
      name: 'Programación en Estado de Alerta Alternado',
      youtubeQuery: 'box breathing pomodoro descanso programación español',
      colorRole: 'shared',
    },
  ],
  [
    {
      slug: 'men_nerv_homeostasis',
      name: 'Homeostasis Emocional y Control del Estado Alerta',
      youtubeQuery: 'regulación sistema nervioso homeostasis emocional español',
      colorRole: 'critical',
    },
  ],
];

const ENFOQUE_GENERATIONS: BranchNodeDef[][] = [
  [
    {
      slug: 'men_focus_atencion_sostenida',
      name: 'Atención Sostenida (Fundamentos de Enfoque)',
      youtubeQuery: 'atención sostenida enfoque mindfulness español',
    },
  ],
  [
    {
      slug: 'men_focus_pomodoro',
      name: 'Bloques Pomodoro Estrictos',
      youtubeQuery: 'técnica pomodoro enfoque productividad español',
    },
    {
      slug: 'men_focus_monotasking',
      name: 'Monotasking Consecutivo',
      youtubeQuery: 'monotasking enfoque una tarea español',
    },
    {
      slug: 'men_focus_higiene_pantallas',
      name: 'Higiene de Pantallas',
      youtubeQuery: 'higiene digital pantallas enfoque español',
    },
  ],
  [
    {
      slug: 'men_focus_binaural',
      name: 'Audio de Enfoque Avanzado (Ondas Binaurales / Ruido Marrón)',
      youtubeQuery: 'ondas binaurales ruido marrón enfoque español',
    },
  ],
  [
    {
      slug: 'men_focus_incomodidad',
      name: 'Práctica de Incomodidad Tolerada',
      youtubeQuery: 'tolerancia a la incomodidad resiliencia mental español',
    },
  ],
  [
    {
      slug: 'men_focus_prog_limpia',
      name: 'Enfoque de Programación Limpia (Pomodoro + Cursor/Roo Code)',
      youtubeQuery: 'deep work programación enfoque pomodoro español',
      colorRole: 'shared',
    },
  ],
  [
    {
      slug: 'men_focus_flow_sostenible',
      name: 'Estado de Flow Sostenible',
      youtubeQuery: 'estado de flow enfoque sostenible español',
      colorRole: 'critical',
    },
  ],
];

const LECTURA_GENERATIONS: BranchNodeDef[][] = [
  [
    {
      slug: 'men_read_lectura_matutina',
      name: 'Lectura de Enfoque Matutino',
      youtubeQuery: 'lectura matutina enfoque hábito español',
    },
  ],
  [
    {
      slug: 'men_read_meditaciones_estoicas',
      name: 'Lectura Estoica Directa (Meditaciones)',
      youtubeQuery: 'meditaciones Marco Aurelio estoicismo lectura español',
    },
    {
      slug: 'men_read_carta_valores',
      name: 'Revisión de Carta de Valores',
      youtubeQuery: 'carta de valores personal desarrollo español',
    },
    {
      slug: 'men_read_analisis_metas',
      name: 'Análisis de Metas',
      youtubeQuery: 'análisis de metas revisión objetivos español',
    },
  ],
  [
    {
      slug: 'men_read_distorsiones',
      name: 'Descifrado de Distorsiones Cognitivas (Lectura Diaria de Sesgos)',
      youtubeQuery: 'distorsiones cognitivas sesgos pensamiento español',
    },
  ],
  [
    {
      slug: 'men_read_dicotomia_control',
      name: 'Revisión de la Dicotomía del Control',
      youtubeQuery: 'dicotomía del control estoicismo español',
    },
  ],
  [
    {
      slug: 'men_read_cierre_diario',
      name: 'Lectura de Cierre y Asimilación de Progreso Diario',
      youtubeQuery: 'reflexión diaria cierre journaling español',
      colorRole: 'shared',
    },
  ],
  [
    {
      slug: 'men_read_mente_antifragil',
      name: 'Perspectiva Inquebrantable / Mente Antifrágil',
      youtubeQuery: 'mente antifrágil resiliencia mental estoicismo español',
      colorRole: 'critical',
    },
  ],
];

export const MENTAL_GALAXY_NODES: MentalGalaxyNodeDef[] = [
  ...buildBranchNodes(
    'nervioso',
    'Regulación del Sistema Nervioso',
    'regulación sistema nervioso respiración consciente español',
    NERVIOSO_GENERATIONS
  ),
  ...buildBranchNodes(
    'enfoque',
    'Enfoque y Cognición Aguda',
    'enfoque cognición atención sostenida español',
    ENFOQUE_GENERATIONS
  ),
  ...buildBranchNodes(
    'lectura',
    'Asimilación y Lectura Diaria',
    'lectura diaria asimilación estoicismo español',
    LECTURA_GENERATIONS
  ),
];

export function buildMentalEmotionalGalaxyCatalogSeeds(): CatalogNodeSeed[] {
  return MENTAL_GALAXY_NODES.map((node) => ({
    slug: node.slug,
    name: node.name,
    type: 'intellectual',
    macroArea: 'mental_emotional',
    parentSlug: node.parentSlug,
    generation: node.generation,
    posX: 0,
    posY: 0,
    youtubeUrl: node.youtubeUrl,
    colorRole: node.colorRole ?? 'standard',
  }));
}

export function getMentalBranchGenOneChildren(
  branchKey: string
): { slug: string; name: string; type: NodeType }[] {
  const branch = branchKey as MentalBranch;
  if (!['nervioso', 'enfoque', 'lectura'].includes(branch)) return [];

  return MENTAL_GALAXY_NODES.filter(
    (node) => node.branch === branch && node.generation === 1
  ).map((node) => ({
    slug: node.slug,
    name: node.name,
    type: 'intellectual' as NodeType,
  }));
}

/** Slugs legacy del catálogo mental anterior que deben eliminarse al sincronizar. */
export const LEGACY_MENTAL_LOCKED_SLUGS = [
  'discipline_mental_emotional_meditation',
  'discipline_mental_emotional_journaling',
  'discipline_mental_emotional_breathing',
  'disc_med_anclaje',
  'disc_med_bodyscan',
  'disc_med_silencio',
  'disc_journal_checkin',
  'disc_journal_patrones',
  'disc_journal_accion',
  'disc_breath_478',
  'disc_breath_caja',
  'disc_breath_diafragma',
  'guide_meditacion',
  'guide_journaling',
  'guide_respiracion',
];
