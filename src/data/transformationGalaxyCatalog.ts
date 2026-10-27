import { CatalogNodeSeed } from '@/src/data/skillCatalogSeeds';
import { NEN_MOTHER_SLUG_BY_ID } from '@/src/config/nenMotherRoots';
import { NodeType } from '@/src/types';
import {
  buildLinearGalaxyBranch,
  CatalogBranchNodeDef,
  LinearGalaxyNodeDef,
  toCatalogSeeds,
} from '@/src/data/catalogBranchBuilder';

export type TransformationBranch = 'ingles' | 'instrumento' | 'meditacion';

const TRANSFORMATION_ROOT = NEN_MOTHER_SLUG_BY_ID.transformation;

const INGLES: CatalogBranchNodeDef[][] = [
  [{ slug: 'trans_eng_e1', name: 'E1: Monitoreo de Brechas y Vocabulario Clínico (glosario BREM/CRPO)', youtubeQuery: 'vocabulario clínico enfermería inglés BREM CRPO Ontario español' }],
  [{ slug: 'trans_eng_e2', name: 'E2: Desglose Fonético y Shadowing en Solitario', youtubeQuery: 'shadowing inglés fonética práctica solo español' }],
  [{ slug: 'trans_eng_e3', name: 'E3: Análisis de Casos y Matices Culturales (Ontario)', youtubeQuery: 'inglés clínico casos Ontario cultura salud español' }],
  [{ slug: 'trans_eng_e4', name: 'E4: Pensamiento Clínico Escrito sin Traducción Interna', youtubeQuery: 'escritura clínica inglés pensamiento directo español' }],
  [{ slug: 'trans_eng_e5', name: 'E5: ★ Identidad Profesional Bilingüe', youtubeQuery: 'identidad profesional bilingüe enfermería español', colorRole: 'critical' }],
];

const INSTRUMENTO: CatalogBranchNodeDef[][] = [
  [{ slug: 'trans_inst_n1', name: 'N1: Sintonía Física (conexión ojo-mano-instrumento)', youtubeQuery: 'técnica instrumento musical ojo mano coordinación español' }],
  [{ slug: 'trans_inst_n2', name: 'N2: Resistencia a la Frustración (práctica deliberada en pasajes difíciles)', youtubeQuery: 'práctica deliberada pasajes difíciles instrumento español' }],
  [{ slug: 'trans_inst_n3', name: 'N3: Ejecución Fluida (tocar bajo presión / cámara)', youtubeQuery: 'tocar instrumento bajo presión cámara español' }],
  [{ slug: 'trans_inst_n4', name: 'N4: Oído Relativo y Conexión auditiva-motora', youtubeQuery: 'oído relativo entrenamiento auditivo motor español' }],
  [{ slug: 'trans_inst_n5', name: 'N5: ★ Conexión Transmutada — Estado de Flow', youtubeQuery: 'flow estado instrumento musical práctica español', colorRole: 'critical' }],
];

const MEDITACION: CatalogBranchNodeDef[][] = [
  [{ slug: 'trans_medit_m1', name: 'M1: Anclaje de la Atención (5-10 min diarios consistentes)', youtubeQuery: 'meditación anclaje atención 10 minutos diarios español' }],
  [{ slug: 'trans_medit_m2', name: 'M2: Monitoreo del Diálogo Interno (autoconsciencia)', youtubeQuery: 'autoconsciencia diálogo interno mindfulness español' }],
  [{ slug: 'trans_medit_m3', name: 'M3: Presencia bajo Estímulos (atención sostenida activa)', youtubeQuery: 'atención sostenida presencia estímulos español' }],
  [{ slug: 'trans_medit_m4', name: 'M4: Descompresión del Sistema Nervioso (respiración / body scan)', youtubeQuery: 'body scan respiración descompresión nerviosa español' }],
  [{ slug: 'trans_medit_m5', name: 'M5: ★ Mente Antifrágil y Centrada', youtubeQuery: 'mente antifrágil meditación resiliencia español', colorRole: 'critical' }],
];

export const TRANSFORMATION_GALAXY_NODES: LinearGalaxyNodeDef[] = [
  ...buildLinearGalaxyBranch(
    'ingles',
    'discipline_transformation_ingles',
    'Inglés Clínico',
    'inglés clínico enfermería Ontario español',
    TRANSFORMATION_ROOT,
    'intellectual',
    'intellectual',
    INGLES
  ),
  ...buildLinearGalaxyBranch(
    'instrumento',
    'discipline_transformation_instrumento',
    'Instrumento Musical',
    'práctica instrumento musical deliberada español',
    TRANSFORMATION_ROOT,
    'intellectual',
    'intellectual',
    INSTRUMENTO
  ),
  ...buildLinearGalaxyBranch(
    'meditacion',
    'discipline_transformation_meditacion',
    'Meditación y Presencia',
    'meditación presencia atención español',
    TRANSFORMATION_ROOT,
    'intellectual',
    'intellectual',
    MEDITACION
  ),
];

export function buildTransformationGalaxyCatalogSeeds(): CatalogNodeSeed[] {
  return toCatalogSeeds(TRANSFORMATION_GALAXY_NODES);
}

export function getTransformationBranchGenOneChildren(
  branchKey: string
): { slug: string; name: string; type: NodeType }[] {
  if (!['ingles', 'instrumento', 'meditacion'].includes(branchKey)) return [];

  return TRANSFORMATION_GALAXY_NODES.filter(
    (node) => node.branch === branchKey && node.generation === 1
  ).map((node) => ({
    slug: node.slug,
    name: node.name,
    type: 'intellectual' as NodeType,
  }));
}

export const LEGACY_TRANSFORMATION_LOCKED_SLUGS = [
  'discipline_intellectual_ingles',
  'discipline_intellectual_nueva_habilidad',
  'trans_skill_n1',
  'trans_skill_n2',
  'trans_skill_n3',
  'trans_skill_n4',
  'trans_skill_n5',
];
