import { CatalogNodeSeed } from '@/src/data/skillCatalogSeeds';
import { NEN_MOTHER_SLUG_BY_ID } from '@/src/config/nenMotherRoots';
import { NodeType } from '@/src/types';
import {
  buildLinearGalaxyBranch,
  CatalogBranchNodeDef,
  LinearGalaxyNodeDef,
  toCatalogSeeds,
} from '@/src/data/catalogBranchBuilder';

export type ManipulationBranch = 'inversiones' | 'recursos';

const MANIPULATION_ROOT = NEN_MOTHER_SLUG_BY_ID.manipulation;

const INVERSIONES: CatalogBranchNodeDef[][] = [
  [{ slug: 'prod_invest_i1', name: 'I1: Fundamentos (qué es un ETF, índices, riesgo)', youtubeQuery: 'fundamentos ETF índices riesgo inversión español' }],
  [{ slug: 'prod_invest_i2', name: 'I2: Primera cuenta de inversión abierta', youtubeQuery: 'abrir cuenta inversión broker Canadá español' }],
  [{ slug: 'prod_invest_i3', name: 'I3: Primer aporte real (aunque sea $50 CAD)', youtubeQuery: 'primer aporte inversión ETF principiante español' }],
  [{ slug: 'prod_invest_i4', name: 'I4: Estrategia DCA activa (aportes regulares)', youtubeQuery: 'DCA dollar cost averaging ETF estrategia español' }],
  [{ slug: 'prod_invest_i5', name: 'I5: ★ Portafolio Diversificado Activo', youtubeQuery: 'portafolio diversificado ETF inversión indexada español', colorRole: 'critical' }],
];

const RECURSOS: CatalogBranchNodeDef[][] = [
  [{ slug: 'prod_rec_r1', name: 'R1: Presupuesto mensual real documentado', youtubeQuery: 'presupuesto mensual personal documentado español' }],
  [{ slug: 'prod_rec_r2', name: 'R2: Sistema de productividad personal (bloques, prioridades)', youtubeQuery: 'sistema productividad bloques prioridades español' }],
  [{ slug: 'prod_rec_r3', name: 'R3: Fondo de emergencia (3 meses de gastos)', youtubeQuery: 'fondo emergencia 3 meses gastos finanzas español' }],
  [{ slug: 'prod_rec_r4', name: 'R4: ★ Arquitecto de su Propio Tiempo', youtubeQuery: 'gestión tiempo arquitecto vida productividad español', colorRole: 'critical' }],
];

export const MANIPULATION_GALAXY_NODES: LinearGalaxyNodeDef[] = [
  ...buildLinearGalaxyBranch(
    'inversiones',
    'discipline_manipulation_inversiones',
    'Inversiones ETF',
    'inversión ETF portafolio diversificado español',
    MANIPULATION_ROOT,
    'productive',
    'intellectual',
    INVERSIONES
  ),
  ...buildLinearGalaxyBranch(
    'recursos',
    'discipline_manipulation_recursos',
    'Gestión de Recursos y Tiempo',
    'gestión recursos tiempo presupuesto productividad español',
    MANIPULATION_ROOT,
    'productive',
    'intellectual',
    RECURSOS
  ),
];

export function buildManipulationGalaxyCatalogSeeds(): CatalogNodeSeed[] {
  return toCatalogSeeds(MANIPULATION_GALAXY_NODES);
}

/** Slugs legacy de manipulación / coding / ETF anterior. */
export const LEGACY_MANIPULATION_CODING_SLUGS = [
  'prod_invest_etf',
  'discipline_productive_coding',
  'discipline_productive_inversiones',
  'discipline_productive_recursos_tiempo',
  'discipline_productive_manip_tiempo',
  'discipline_productive_manip_recursos',
  'discipline_productive_manip_biologica',
  'prod_manip_tiempo_ritmo_diario',
  'prod_manip_tiempo_dos_minutos',
  'prod_manip_tiempo_bloques_inamovibles',
  'prod_manip_tiempo_rituales_transicion',
  'prod_manip_tiempo_flujo_antiprocrastinacion',
  'prod_manip_recursos_ahorro_flujo',
  'prod_manip_recursos_indexada',
  'prod_manip_recursos_presupuesto_cero',
  'prod_manip_recursos_optimizar_gastos',
  'prod_manip_recursos_interes_compuesto',
  'prod_manip_bio_conservacion',
  'prod_manip_bio_fermentacion',
  'prod_manip_bio_pickling',
  'prod_manip_bio_deshidratacion',
  'prod_manip_bio_maduracion_guarda',
  'prod_code_terminal_git',
  'prod_code_env_setup',
  'prod_code_debugging',
  'prod_code_rn_fundamentals',
  'prod_code_expo_eas',
  'prod_code_expo_router',
  'prod_code_supabase',
  'prod_code_sqlite',
  'prod_code_rest_apis',
  'prod_code_prompting',
  'prod_code_agents_roo',
  'prod_code_ai_apis',
  'prod_code_ia_architect',
  'prod_code_app_published',
  'disc_code_react',
  'disc_code_typescript',
  'disc_code_git',
  'disc_code_algoritmos',
  'disc_code_proyecto',
  'disc_code_refactor',
] as const;
