import { CatalogNodeSeed } from '@/src/data/skillCatalogSeeds';
import { NEN_MOTHER_SLUG_BY_ID } from '@/src/config/nenMotherRoots';
import { MacroArea, NodeColorRole, NodeType } from '@/src/types';

export type PhysicalBranch = 'gimnasio' | 'judo' | 'fisioterapia';

export type CatalogColorRole = NodeColorRole;

export interface PhysicalGalaxyNodeDef {
  slug: string;
  name: string;
  parentSlug: string;
  generation: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  branch: PhysicalBranch;
  youtubeUrl: string;
  colorRole?: CatalogColorRole;
}

/** @deprecated Usar GENERATION_RADII_BY_LEVEL en mapGeometry.ts */
export { PHYSICAL_GENERATION_RADII } from '@/src/utils/mapGeometry';

const BRANCH_ROOT_SLUG: Record<PhysicalBranch, string> = {
  gimnasio: NEN_MOTHER_SLUG_BY_ID.intensification,
  judo: NEN_MOTHER_SLUG_BY_ID.transformation,
  fisioterapia: NEN_MOTHER_SLUG_BY_ID.transformation,
};

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
  branch: PhysicalBranch,
  vertienteName: string,
  vertienteQuery: string,
  generations: BranchNodeDef[][]
): PhysicalGalaxyNodeDef[] {
  const vertSlug = `discipline_physical_${branch}`;
  const nodes: PhysicalGalaxyNodeDef[] = [
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
    const generation = (generationIndex + 1) as PhysicalGalaxyNodeDef['generation'];
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

const GIMNASIO_GENERATIONS: BranchNodeDef[][] = [
  [
    { slug: 'phy_gym_squat', name: 'Sentadilla (Squat)', youtubeQuery: 'sentadilla técnica correcta español' },
    { slug: 'phy_gym_deadlift', name: 'Peso Muerto (Deadlift)', youtubeQuery: 'peso muerto técnica correcta español' },
    { slug: 'phy_gym_hip_thrust', name: 'Hip Thrust', youtubeQuery: 'hip thrust glúteos técnica español' },
  ],
  [
    { slug: 'phy_gym_back_row', name: 'Tracción de Espalda', youtubeQuery: 'remo con barra espalda técnica español' },
    { slug: 'phy_gym_bulgarian_split', name: 'Sentadilla Búlgara', youtubeQuery: 'sentadilla búlgara técnica español' },
    { slug: 'phy_gym_shoulder_press', name: 'Press de Hombros', youtubeQuery: 'press militar hombros técnica español' },
    { slug: 'phy_gym_bicep_curl', name: 'Curl de Bíceps', youtubeQuery: 'curl bíceps mancuernas técnica español' },
  ],
  [
    { slug: 'phy_gym_farmers_walk', name: 'Paseo del Granjero', youtubeQuery: 'farmer walk técnica español' },
    { slug: 'phy_gym_dumbbell_bench', name: 'Press Banca con Mancuernas', youtubeQuery: 'press banca mancuernas técnica español' },
    { slug: 'phy_gym_dynamic_plank', name: 'Plancha Dinámica Core', youtubeQuery: 'plancha abdominal dinámica español' },
  ],
  [
    { slug: 'phy_gym_paused_squat', name: 'Sentadilla Pausada', youtubeQuery: 'sentadilla pausada powerlifting español' },
    { slug: 'phy_gym_deficit_deadlift', name: 'Peso Muerto Déficit', youtubeQuery: 'deadlift déficit técnica español' },
    { slug: 'phy_gym_iso_hip_thrust', name: 'Hip Thrust Isométrico', youtubeQuery: 'hip thrust isométrico glúteos español' },
  ],
  [
    { slug: 'phy_gym_quad_extension', name: 'Extensiones de Cuádriceps', youtubeQuery: 'extension cuádriceps máquina español' },
    { slug: 'phy_gym_supported_row', name: 'Remo con Apoyo', youtubeQuery: 'remo con apoyo pecho técnica español' },
    { slug: 'phy_gym_lateral_raise', name: 'Elevaciones Laterales', youtubeQuery: 'elevaciones laterales hombro español' },
    {
      slug: 'phy_gym_iron_mind_bar',
      name: 'Mente de Hierro ante la Barra',
      youtubeQuery: 'estoicismo entrenamiento fuerza dolor muscular español',
      colorRole: 'shared',
    },
  ],
  [
    {
      slug: 'phy_gym_max_potential',
      name: 'Máximo Potencial Estimulado',
      youtubeQuery: 'periodización hipertrofia avanzada español',
      colorRole: 'critical',
    },
  ],
];

const JUDO_GENERATIONS: BranchNodeDef[][] = [
  [
    { slug: 'phy_judo_reiho', name: 'Reiho (Saludo)', youtubeQuery: 'judo reiho saludo etiqueta español' },
    { slug: 'phy_judo_shisei', name: 'Shisei (Posturas)', youtubeQuery: 'judo shisei postura natural español' },
    { slug: 'phy_judo_shintai', name: 'Shintai (Desplazamientos)', youtubeQuery: 'judo tsukuri desplazamientos español' },
    { slug: 'phy_judo_ukemi', name: 'Ukemi (Caídas)', youtubeQuery: 'judo ukemi caídas principiantes español' },
    { slug: 'phy_judo_kuzushi', name: 'Kuzushi (Desequilibrio)', youtubeQuery: 'judo kuzushi desequilibrio español' },
  ],
  [
    { slug: 'phy_judo_de_ashi_harai', name: 'De-Ashi-Harai', youtubeQuery: 'judo de ashi harai español' },
    { slug: 'phy_judo_hiza_guruma', name: 'Hiza-Guruma', youtubeQuery: 'judo hiza guruma español' },
    { slug: 'phy_judo_sasae_tsuri', name: 'Sasae-Tsuri-Komi-Ashi', youtubeQuery: 'judo sasae tsurikomi ashi español' },
    { slug: 'phy_judo_uki_goshi', name: 'Uki-Goshi', youtubeQuery: 'judo uki goshi español' },
    { slug: 'phy_judo_o_soto_gari', name: 'O-Soto-Gari', youtubeQuery: 'judo o soto gari español' },
    { slug: 'phy_judo_o_goshi', name: 'O-Goshi', youtubeQuery: 'judo o goshi español' },
    { slug: 'phy_judo_o_uchi_gari', name: 'O-Uchi-Gari', youtubeQuery: 'judo o uchi gari español' },
    { slug: 'phy_judo_seoi_nage', name: 'Seoi-Nage', youtubeQuery: 'judo seoi nage español' },
  ],
  [
    { slug: 'phy_judo_kosoto_gari', name: 'Kosoto-Gari', youtubeQuery: 'judo kosoto gari español' },
    { slug: 'phy_judo_kouchi_gari', name: 'Kouchi-Gari', youtubeQuery: 'judo kouchi gari español' },
    { slug: 'phy_judo_koshi_guruma', name: 'Koshi-Guruma', youtubeQuery: 'judo koshi guruma español' },
    { slug: 'phy_judo_tsuri_komi_goshi', name: 'Tsuri-Komi-Goshi', youtubeQuery: 'judo tsurikomi goshi español' },
    { slug: 'phy_judo_okuri_ashi_harai', name: 'Okuri-Ashi-Harai', youtubeQuery: 'judo okuri ashi harai español' },
    { slug: 'phy_judo_tai_otoshi', name: 'Tai-Otoshi', youtubeQuery: 'judo tai otoshi español' },
    { slug: 'phy_judo_ne_waza', name: 'Ne-Waza (Suelo)', youtubeQuery: 'judo ne waza suelo español' },
  ],
  [
    { slug: 'phy_judo_harai_goshi', name: 'Harai-Goshi', youtubeQuery: 'judo harai goshi español' },
    { slug: 'phy_judo_uchimata', name: 'Uchimata', youtubeQuery: 'judo uchimata español' },
    { slug: 'phy_judo_tomoe_nage', name: 'Tomoe-Nage', youtubeQuery: 'judo tomoe nage español' },
    { slug: 'phy_judo_kata_guruma', name: 'Kata-Guruma', youtubeQuery: 'judo kata guruma español' },
  ],
  [
    {
      slug: 'phy_judo_hybrid_hip_ogoshi',
      name: 'Fuerza Explosiva de Cadera (Hip Thrust + O-Goshi)',
      youtubeQuery: 'hip thrust potencia cadera judo español',
      colorRole: 'shared',
    },
    {
      slug: 'phy_judo_hybrid_grip_kumikata',
      name: 'Tracción de Solapa Asistida (Espalda + Kumi-Kata)',
      youtubeQuery: 'kumi kata agarre judo tracción español',
      colorRole: 'shared',
    },
  ],
  [
    {
      slug: 'phy_judo_shodan',
      name: 'Shodan Cinturón Negro',
      youtubeQuery: 'judo examen cinturón negro shodan español',
      colorRole: 'critical',
    },
  ],
];

const FISIOTERAPIA_GENERATIONS: BranchNodeDef[][] = [
  [
    { slug: 'phy_physio_hip_9090', name: 'Movilidad de Cadera 90/90', youtubeQuery: 'movilidad cadera 90 90 español' },
    { slug: 'phy_physio_scapular_ywt', name: 'Estabilidad Escapular YWT', youtubeQuery: 'ejercicios Y T W escápula español' },
    { slug: 'phy_physio_ankle_dorsiflex', name: 'Dorsiflexión de Tobillo', youtubeQuery: 'movilidad tobillo dorsiflexión español' },
  ],
  [
    { slug: 'phy_physio_patellar_iso', name: 'Isometría de Tendón Rotuliano', youtubeQuery: 'isométrico cuádriceps tendón rotuliano español' },
    { slug: 'phy_physio_cat_camel', name: 'Gato-Camello Columna', youtubeQuery: 'ejercicio gato camello columna español' },
    { slug: 'phy_physio_wrist_strength', name: 'Fortalecimiento de Muñecas', youtubeQuery: 'fortalecer muñecas antebrazo español' },
  ],
  [
    { slug: 'phy_physio_psoas_stretch', name: 'Estiramiento de Psoas', youtubeQuery: 'estiramiento psoas iliaco español' },
    { slug: 'phy_physio_thoracic_roller', name: 'Apertura Torácica con Rodillo', youtubeQuery: 'movilidad torácica foam roller español' },
    { slug: 'phy_physio_lumbar_decompression', name: 'Descompresión Lumbar en Barra', youtubeQuery: 'descompresión lumbar colgarse barra español' },
  ],
  [
    {
      slug: 'phy_physio_glute_pre_squat',
      name: 'Activación Glútea Pre-Sentadilla',
      youtubeQuery: 'activación glúteos antes sentadilla español',
      colorRole: 'shared',
    },
  ],
  [
    { slug: 'phy_physio_unilateral_balance', name: 'Equilibrio Unilateral Inestable', youtubeQuery: 'equilibrio unipodal inestable fisioterapia español' },
    { slug: 'phy_physio_hip_suspension', name: 'Coordinación de Cadera en Suspensión', youtubeQuery: 'ejercicios cadera TRX suspensión español' },
  ],
  [
    {
      slug: 'phy_physio_antifragile',
      name: 'Cuerpo Resiliente Antifrágil',
      youtubeQuery: 'prevención lesiones fortalecimiento articular español',
      colorRole: 'critical',
    },
  ],
];

export const PHYSICAL_GALAXY_NODES: PhysicalGalaxyNodeDef[] = [
  ...buildBranchNodes(
    'gimnasio',
    'Gimnasio (Hipertrofia)',
    'hipertrofia rutina gimnasio principiante español',
    GIMNASIO_GENERATIONS
  ),
  ...buildBranchNodes(
    'judo',
    'Judo (Camino de Cinturones)',
    'judo fundamentos principiantes español',
    JUDO_GENERATIONS
  ),
  ...buildBranchNodes(
    'fisioterapia',
    'Fisioterapia (Blindaje Articular)',
    'fisioterapia prevención lesiones articular español',
    FISIOTERAPIA_GENERATIONS
  ),
];

export function buildPhysicalGalaxyCatalogSeeds(): CatalogNodeSeed[] {
  return PHYSICAL_GALAXY_NODES.map((node) => ({
    slug: node.slug,
    name: node.name,
    type: 'physical',
    macroArea: 'physical',
    parentSlug: node.parentSlug,
    generation: node.generation,
    posX: 0,
    posY: 0,
    youtubeUrl: node.youtubeUrl,
    colorRole: node.colorRole ?? 'standard',
  }));
}

export function getPhysicalBranchGenOneChildren(
  branchKey: string
): { slug: string; name: string; type: NodeType }[] {
  const branch = branchKey as PhysicalBranch;
  if (!['gimnasio', 'judo', 'fisioterapia'].includes(branch)) return [];

  return PHYSICAL_GALAXY_NODES.filter(
    (node) => node.branch === branch && node.generation === 1
  ).map((node) => ({
    slug: node.slug,
    name: node.name,
    type: 'physical' as NodeType,
  }));
}

/** Slugs legacy del catálogo físico anterior que deben eliminarse al sincronizar. */
export const LEGACY_PHYSICAL_LOCKED_SLUGS = [
  'discipline_physical_karate',
  'discipline_physical_yoga',
  'discipline_physical_running',
  'disc_karate_kata',
  'disc_karate_kihon',
  'disc_karate_kumite',
  'disc_yoga_saludo',
  'disc_yoga_respiracion',
  'disc_yoga_equilibrio',
  'disc_run_calentamiento',
  'disc_run_ritmo',
  'disc_run_recuperacion',
  'guide_yoga',
  'guide_caminata',
];
