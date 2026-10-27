import { CatalogNodeSeed } from '@/src/data/skillCatalogSeeds';
import { NEN_MOTHER_SLUG_BY_ID } from '@/src/config/nenMotherRoots';
import { NodeType } from '@/src/types';
import {
  buildLinearGalaxyBranch,
  CatalogBranchNodeDef,
  LinearGalaxyNodeDef,
  toCatalogSeeds,
} from '@/src/data/catalogBranchBuilder';

export type PhysicalBranch = 'gimnasio' | 'judo' | 'fisioterapia';

const INTENSIFICATION_ROOT = NEN_MOTHER_SLUG_BY_ID.intensification;

const BRANCH_ROOT: Record<PhysicalBranch, string> = {
  gimnasio: INTENSIFICATION_ROOT,
  judo: INTENSIFICATION_ROOT,
  fisioterapia: INTENSIFICATION_ROOT,
};

const GIMNASIO: CatalogBranchNodeDef[][] = [
  [{ slug: 'phy_gym_g1', name: 'G1: Técnicas Base (Sentadilla, Peso Muerto, Press)', youtubeQuery: 'sentadilla peso muerto press banca técnica español' }],
  [{ slug: 'phy_gym_g2', name: 'G2: Construcción de Volumen (series, descanso, nutrición básica)', youtubeQuery: 'volumen hipertrofia series descanso nutrición español' }],
  [{ slug: 'phy_gym_g3', name: 'G3: Fuerza Progresiva (periodización, 1RM, sobrecarga)', youtubeQuery: 'periodización fuerza 1RM sobrecarga progresiva español' }],
  [{ slug: 'phy_gym_g4', name: 'G4: Composición Corporal (déficit/superávit, mediciones)', youtubeQuery: 'composición corporal déficit superávit mediciones español' }],
  [{ slug: 'phy_gym_g5', name: 'G5: ★ Atleta Funcional', youtubeQuery: 'atleta funcional entrenamiento integrado español', colorRole: 'critical' }],
];

const JUDO: CatalogBranchNodeDef[][] = [
  [{ slug: 'phy_judo_j1', name: 'J1: Fundamentos (Ukemi, Kuzushi, Reiho, postura)', youtubeQuery: 'judo ukemi kuzushi reiho fundamentos español' }],
  [{ slug: 'phy_judo_j2', name: 'J2: Técnicas de Pie Gokyo (De-Ashi, O-Goshi, Seoi-Nage)', youtubeQuery: 'judo gokyo de ashi o goshi seoi nage español' }],
  [{ slug: 'phy_judo_j3', name: 'J3: Ne-Waza (suelo, inmovilizaciones, estrangulaciones)', youtubeQuery: 'judo ne waza suelo inmovilizaciones español' }],
  [{ slug: 'phy_judo_j4', name: 'J4: Competencia y Randori libre', youtubeQuery: 'judo randori competencia entrenamiento español' }],
  [{ slug: 'phy_judo_j5', name: 'J5: ★ Shodan — Cinturón Negro', youtubeQuery: 'judo examen cinturón negro shodan español', colorRole: 'critical' }],
];

const FISIOTERAPIA: CatalogBranchNodeDef[][] = [
  [{ slug: 'phy_physio_f1', name: 'F1: Movilidad Base (caderas, hombros, tobillo)', youtubeQuery: 'movilidad cadera hombro tobillo fisioterapia español' }],
  [{ slug: 'phy_physio_f2', name: 'F2: Activación y Estabilización (core, escápulas, glúteos)', youtubeQuery: 'activación core escápulas glúteos estabilización español' }],
  [{ slug: 'phy_physio_f3', name: 'F3: Prevención de Lesiones Específicas (rodilla, lumbar, muñeca)', youtubeQuery: 'prevención lesiones rodilla lumbar muñeca español' }],
  [{ slug: 'phy_physio_f4', name: 'F4: ★ Cuerpo Antifrágil', youtubeQuery: 'cuerpo antifrágil prevención lesiones articular español', colorRole: 'shared' }],
];

export const PHYSICAL_GALAXY_NODES: LinearGalaxyNodeDef[] = [
  ...buildLinearGalaxyBranch(
    'gimnasio',
    'discipline_physical_gimnasio',
    'Gimnasio — Hipertrofia y Fuerza',
    'hipertrofia rutina gimnasio fuerza español',
    BRANCH_ROOT.gimnasio,
    'physical',
    'physical',
    GIMNASIO
  ),
  ...buildLinearGalaxyBranch(
    'judo',
    'discipline_physical_judo',
    'Judo — Camino de Cinturones',
    'judo camino cinturones fundamentos español',
    BRANCH_ROOT.judo,
    'physical',
    'physical',
    JUDO
  ),
  ...buildLinearGalaxyBranch(
    'fisioterapia',
    'discipline_physical_fisioterapia',
    'Fisioterapia — Blindaje Articular',
    'fisioterapia blindaje articular movilidad español',
    BRANCH_ROOT.fisioterapia,
    'physical',
    'physical',
    FISIOTERAPIA
  ),
];

export function buildPhysicalGalaxyCatalogSeeds(): CatalogNodeSeed[] {
  return toCatalogSeeds(PHYSICAL_GALAXY_NODES);
}

export function getPhysicalBranchGenOneChildren(
  branchKey: string
): { slug: string; name: string; type: NodeType }[] {
  if (!['gimnasio', 'judo', 'fisioterapia'].includes(branchKey)) return [];

  return PHYSICAL_GALAXY_NODES.filter(
    (node) => node.branch === branchKey && node.generation === 1
  ).map((node) => ({
    slug: node.slug,
    name: node.name,
    type: 'physical' as NodeType,
  }));
}

/** Slugs legacy del catálogo físico anterior. */
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
  'phy_gym_squat',
  'phy_gym_deadlift',
  'phy_gym_hip_thrust',
  'phy_gym_back_row',
  'phy_gym_bulgarian_split',
  'phy_gym_shoulder_press',
  'phy_gym_bicep_curl',
  'phy_gym_farmers_walk',
  'phy_gym_dumbbell_bench',
  'phy_gym_dynamic_plank',
  'phy_gym_paused_squat',
  'phy_gym_deficit_deadlift',
  'phy_gym_iso_hip_thrust',
  'phy_gym_quad_extension',
  'phy_gym_supported_row',
  'phy_gym_lateral_raise',
  'phy_gym_iron_mind_bar',
  'phy_gym_max_potential',
  'phy_judo_reiho',
  'phy_judo_shisei',
  'phy_judo_shintai',
  'phy_judo_ukemi',
  'phy_judo_kuzushi',
  'phy_judo_de_ashi_harai',
  'phy_judo_hiza_guruma',
  'phy_judo_sasae_tsuri',
  'phy_judo_uki_goshi',
  'phy_judo_o_soto_gari',
  'phy_judo_o_goshi',
  'phy_judo_o_uchi_gari',
  'phy_judo_seoi_nage',
  'phy_judo_kosoto_gari',
  'phy_judo_kouchi_gari',
  'phy_judo_koshi_guruma',
  'phy_judo_tsuri_komi_goshi',
  'phy_judo_okuri_ashi_harai',
  'phy_judo_tai_otoshi',
  'phy_judo_ne_waza',
  'phy_judo_harai_goshi',
  'phy_judo_uchimata',
  'phy_judo_tomoe_nage',
  'phy_judo_kata_guruma',
  'phy_judo_hybrid_hip_ogoshi',
  'phy_judo_hybrid_grip_kumikata',
  'phy_judo_shodan',
  'phy_physio_hip_9090',
  'phy_physio_scapular_ywt',
  'phy_physio_ankle_dorsiflex',
  'phy_physio_patellar_iso',
  'phy_physio_cat_camel',
  'phy_physio_wrist_strength',
  'phy_physio_psoas_stretch',
  'phy_physio_thoracic_roller',
  'phy_physio_lumbar_decompression',
  'phy_physio_glute_pre_squat',
  'phy_physio_unilateral_balance',
  'phy_physio_hip_suspension',
  'phy_physio_antifragile',
];
