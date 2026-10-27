import { CatalogNodeSeed } from '@/src/data/skillCatalogSeeds';
import { NEN_MOTHER_SLUG_BY_ID } from '@/src/config/nenMotherRoots';
import { NodeType } from '@/src/types';
import {
  buildLinearGalaxyBranch,
  CatalogBranchNodeDef,
  LinearGalaxyNodeDef,
  toCatalogSeeds,
} from '@/src/data/catalogBranchBuilder';

export type MentalBranch = 'lectura' | 'filosofia';

const SPECIALIZATION_ROOT = NEN_MOTHER_SLUG_BY_ID.specialization;

const LECTURA: CatalogBranchNodeDef[][] = [
  [{ slug: 'men_read_l1', name: 'L1: Hábito de lectura diaria (15 min mínimo)', youtubeQuery: 'hábito lectura diaria 15 minutos español' }],
  [{ slug: 'men_read_l2', name: 'L2: Sistema de notas y retención (Zettelkasten básico)', youtubeQuery: 'zettelkasten notas retención lectura español' }],
  [{ slug: 'men_read_l3', name: 'L3: 12 libros leídos y asimilados en el año', youtubeQuery: 'leer 12 libros año asimilación español' }],
  [{ slug: 'men_read_l4', name: 'L4: ★ Lector Activo', youtubeQuery: 'lector activo asimilación libros español', colorRole: 'critical' }],
];

const FILOSOFIA: CatalogBranchNodeDef[][] = [
  [{ slug: 'men_phil_s1', name: 'S1: Dicotomía del Control (práctica diaria)', youtubeQuery: 'dicotomía del control estoicismo práctica español' }],
  [{ slug: 'men_phil_s2', name: 'S2: Regulación emocional y sistema nervioso', youtubeQuery: 'regulación emocional sistema nervioso español' }],
  [{ slug: 'men_phil_s3', name: 'S3: Aplicación clínica — DBT y psicología positiva', youtubeQuery: 'DBT psicología positiva aplicación clínica español' }],
  [{ slug: 'men_phil_s4', name: 'S4: Escritura reflexiva (novela, journaling, ensayo)', youtubeQuery: 'escritura reflexiva journaling novela ensayo español' }],
  [{ slug: 'men_phil_s5', name: 'S5: ★ Perspectiva Inquebrantable', youtubeQuery: 'perspectiva inquebrantable estoicismo resiliencia español', colorRole: 'critical' }],
];

export const MENTAL_GALAXY_NODES: LinearGalaxyNodeDef[] = [
  ...buildLinearGalaxyBranch(
    'lectura',
    'discipline_specialization_lectura',
    'Lectura — Asimilación',
    'lectura diaria asimilación libros español',
    SPECIALIZATION_ROOT,
    'mental_emotional',
    'intellectual',
    LECTURA
  ),
  ...buildLinearGalaxyBranch(
    'filosofia',
    'discipline_specialization_filosofia',
    'Filosofía Práctica — Estoicismo y Psicología',
    'estoicismo psicología práctica reflexión español',
    SPECIALIZATION_ROOT,
    'mental_emotional',
    'intellectual',
    FILOSOFIA
  ),
];

export function buildMentalEmotionalGalaxyCatalogSeeds(): CatalogNodeSeed[] {
  return toCatalogSeeds(MENTAL_GALAXY_NODES);
}

export function getMentalBranchGenOneChildren(
  branchKey: string
): { slug: string; name: string; type: NodeType }[] {
  if (!['lectura', 'filosofia'].includes(branchKey)) return [];

  return MENTAL_GALAXY_NODES.filter(
    (node) => node.branch === branchKey && node.generation === 1
  ).map((node) => ({
    slug: node.slug,
    name: node.name,
    type: 'intellectual' as NodeType,
  }));
}

/** Slugs legacy del catálogo mental anterior. */
export const LEGACY_MENTAL_LOCKED_SLUGS = [
  'discipline_mental_emotional_lectura',
  'discipline_mental_emotional_filosofia_practica',
  'discipline_mental_emotional_meditation',
  'discipline_mental_emotional_journaling',
  'discipline_mental_emotional_breathing',
  'discipline_mental_emotional_nervioso',
  'discipline_mental_emotional_enfoque',
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
  'men_nerv_respiracion_fundamentos',
  'men_nerv_box_breathing',
  'men_nerv_478',
  'men_nerv_diafragmatica',
  'men_nerv_body_scan',
  'men_nerv_jacobson',
  'men_nerv_duchas_frias',
  'men_nerv_anclaje_judo',
  'men_nerv_alert_coding',
  'men_nerv_homeostasis',
  'men_focus_atencion_sostenida',
  'men_focus_pomodoro',
  'men_focus_monotasking',
  'men_focus_higiene_pantallas',
  'men_focus_binaural',
  'men_focus_incomodidad',
  'men_focus_prog_limpia',
  'men_focus_flow_sostenible',
  'men_read_lectura_matutina',
  'men_read_meditaciones_estoicas',
  'men_read_carta_valores',
  'men_read_analisis_metas',
  'men_read_distorsiones',
  'men_read_dicotomia_control',
  'men_read_cierre_diario',
  'men_read_mente_antifragil',
];
