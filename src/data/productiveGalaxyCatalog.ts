import { CatalogNodeSeed } from '@/src/data/skillCatalogSeeds';
import { NEN_MOTHER_SLUG_BY_ID } from '@/src/config/nenMotherRoots';
import { NodeType } from '@/src/types';
import {
  buildLinearGalaxyBranch,
  CatalogBranchNodeDef,
  LinearGalaxyNodeDef,
  toCatalogSeeds,
} from '@/src/data/catalogBranchBuilder';

export type EmissionBranch = 'video' | 'presencia';
export type MaterializationBranch = 'productos' | 'clientes';

const EMISSION_ROOT = NEN_MOTHER_SLUG_BY_ID.emission;
const MATERIALIZATION_ROOT = NEN_MOTHER_SLUG_BY_ID.materialization;

const VIDEO: CatalogBranchNodeDef[][] = [
  [{ slug: 'prod_video_v1', name: 'V1: Primer Video Publicado (cualquier canal)', youtubeQuery: 'primer video youtube publicado tutorial español' }],
  [{ slug: 'prod_video_v2', name: 'V2: Consistencia — 8 videos publicados', youtubeQuery: 'consistencia youtube 8 videos calendario español' }],
  [{ slug: 'prod_video_v3', name: 'V3: Optimización SEO y thumbnails', youtubeQuery: 'seo youtube thumbnails optimización español' }],
  [{ slug: 'prod_video_v4', name: 'V4: Primer Video con 1K+ vistas orgánicas', youtubeQuery: 'youtube 1000 vistas orgánicas crecimiento español' }],
  [{ slug: 'prod_video_v5', name: 'V5: ★ Canal con Audiencia Propia', youtubeQuery: 'canal youtube audiencia propia comunidad español', colorRole: 'critical' }],
];

const PRESENCIA: CatalogBranchNodeDef[][] = [
  [{ slug: 'prod_pres_d1', name: 'D1: Identidad de marca definida (logo, colores, voz)', youtubeQuery: 'identidad marca personal logo colores voz español' }],
  [{ slug: 'prod_pres_d2', name: 'D2: Web/portfolio activo y actualizado', youtubeQuery: 'portfolio web personal actualizado español' }],
  [{ slug: 'prod_pres_d3', name: 'D3: Red social con 500+ seguidores reales', youtubeQuery: 'crecer red social seguidores reales español' }],
  [{ slug: 'prod_pres_d4', name: 'D4: ★ Marca Personal Reconocible', youtubeQuery: 'marca personal reconocible presencia digital español', colorRole: 'shared' }],
];

const PRODUCTOS: CatalogBranchNodeDef[][] = [
  [{ slug: 'prod_arch_p1', name: 'P1: El Plano del Arquitecto (índice / guion / estructura)', youtubeQuery: 'plan producto digital índice guion estructura español' }],
  [{ slug: 'prod_arch_p2', name: 'P2: Ensamblaje y Activos Visuales (producción base)', youtubeQuery: 'producción activos visuales producto digital español' }],
  [{ slug: 'prod_arch_p3', name: 'P3: El Producto Terminado (masterización y exportación)', youtubeQuery: 'masterización exportación producto digital español' }],
  [{ slug: 'prod_arch_p4', name: 'P4: Automatización del Delivery (plataforma de distribución)', youtubeQuery: 'automatización delivery producto digital plataforma español' }],
  [{ slug: 'prod_arch_p5', name: 'P5: ★ El Creador Prolífico', youtubeQuery: 'creador prolífico productos digitales español', colorRole: 'critical' }],
];

const CLIENTES: CatalogBranchNodeDef[][] = [
  [{ slug: 'prod_cli_c1', name: 'C1: Perfil de Oferta Irresistible (vitrina y portafolio)', youtubeQuery: 'oferta irresistible portafolio web freelance español' }],
  [{ slug: 'prod_cli_c2', name: 'C2: Mapeo de Prospectos (lista de 20-30 negocios locales)', youtubeQuery: 'prospección clientes locales negocios lista español' }],
  [{ slug: 'prod_cli_c3', name: 'C3: El Primer Contacto (cold outreach — 10-15 mensajes)', youtubeQuery: 'cold outreach primer contacto clientes web español' }],
  [{ slug: 'prod_cli_c4', name: 'C4: Propuesta y Negociación (llamada + cotización formal)', youtubeQuery: 'propuesta negociación cotización cliente web español' }],
  [{ slug: 'prod_cli_c5', name: 'C5: ★ Contrato Cerrado — Primer Cliente Web', youtubeQuery: 'cerrar contrato primer cliente web freelance español', colorRole: 'critical' }],
];

export const PRODUCTIVE_GALAXY_NODES: LinearGalaxyNodeDef[] = [
  ...buildLinearGalaxyBranch(
    'video',
    'discipline_emission_video',
    'Contenido de Video',
    'contenido video youtube canal español',
    EMISSION_ROOT,
    'productive',
    'intellectual',
    VIDEO
  ),
  ...buildLinearGalaxyBranch(
    'presencia',
    'discipline_emission_presencia',
    'Presencia Digital',
    'presencia digital marca personal español',
    EMISSION_ROOT,
    'productive',
    'intellectual',
    PRESENCIA
  ),
  ...buildLinearGalaxyBranch(
    'productos',
    'discipline_materialization_productos',
    'Factoría de Productos Digitales',
    'productos digitales factoría creación español',
    MATERIALIZATION_ROOT,
    'productive',
    'intellectual',
    PRODUCTOS
  ),
  ...buildLinearGalaxyBranch(
    'clientes',
    'discipline_materialization_clientes',
    'Agencia Web / Clientes',
    'agencia web clientes freelance outreach español',
    MATERIALIZATION_ROOT,
    'productive',
    'intellectual',
    CLIENTES
  ),
];

export function buildProductiveGalaxyCatalogSeeds(): CatalogNodeSeed[] {
  return toCatalogSeeds(PRODUCTIVE_GALAXY_NODES);
}

/** Slugs legacy del catálogo productivo/emisión anterior. */
export const LEGACY_PRODUCTIVE_LOCKED_SLUGS = [
  'discipline_productive_contenido_video',
  'discipline_productive_presencia_digital',
  'discipline_productive_productos_digitales',
  'discipline_productive_stack_tecnico',
  'discipline_productive_design',
  'discipline_productive_writing',
  'prod_stack_t1',
  'prod_stack_t2',
  'prod_stack_t3',
  'prod_stack_t4',
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
  'prod_write_research',
  'prod_write_narrative',
  'prod_write_script_pacing',
  'prod_write_elevenlabs',
  'prod_write_midjourney',
  'prod_write_suno',
  'prod_write_runway',
  'prod_write_premiere',
  'prod_write_subtitles',
  'prod_write_seo_publish',
  'prod_write_instagram_reel',
  'prod_write_metrics',
  'prod_write_pipeline',
  'prod_write_monetized',
];
