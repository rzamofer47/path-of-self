import {
  DECAY_CATEGORIAS,
  DecayCategoria,
  DEFAULT_DECAY_CATEGORIA,
} from '@/src/config/nenDecayConfig';
import { resolveVertienteId, VertienteId } from '@/src/config/nenConfig';
import { SkillNode } from '@/src/types';

/** Slugs con categoría explícita (sinergias Gen 5 y excepciones). */
const SLUG_OVERRIDES: Record<string, DecayCategoria> = {
  phy_judo_reiho: 'habito_diario',
  phy_judo_shisei: 'habito_diario',
  phy_judo_shintai: 'habito_diario',
  men_nerv_respiracion_fundamentos: 'habito_diario',
  men_nerv_box_breathing: 'habito_diario',
  men_nerv_478: 'habito_diario',
  men_nerv_diafragmatica: 'habito_diario',
  men_nerv_body_scan: 'habito_diario',
  men_nerv_jacobson: 'habito_diario',
  men_nerv_duchas_frias: 'habito_diario',
  men_focus_pomodoro: 'habito_diario',
  men_focus_monotasking: 'habito_diario',
  men_focus_higiene_pantallas: 'habito_diario',
  men_read_meditaciones_estoicas: 'cognitivo_filosofico',
  men_read_carta_valores: 'cognitivo_filosofico',
  men_read_dicotomia_control: 'cognitivo_filosofico',
  men_read_distorsiones: 'cognitivo_filosofico',
  prod_write_research: 'cognitivo_filosofico',
  prod_write_metrics: 'cognitivo_filosofico',
  guide_lectura: 'cognitivo_filosofico',
  guide_idioma: 'cognitivo_filosofico',
  guide_pomodoro: 'habito_diario',
};

const VERTIENTE_DEFAULT: Record<VertienteId, DecayCategoria> = {
  gimnasio: 'motor_explosivo',
  judo: 'motor_explosivo',
  fisioterapia: 'motor_movilidad',
  nervioso: 'habito_diario',
  enfoque: 'habito_diario',
  lectura: 'cognitivo_filosofico',
  coding: 'tecnico_digital',
  writing: 'creativo_produccion',
  design: 'tecnico_digital',
  guitar: 'cognitivo_filosofico',
  piano: 'cognitivo_filosofico',
  language: 'cognitivo_filosofico',
};

function fasterDecayCategory(a: DecayCategoria, b: DecayCategoria): DecayCategoria {
  return DECAY_CATEGORIAS[a].tasaSemanal >= DECAY_CATEGORIAS[b].tasaSemanal ? a : b;
}

function resolveFromSlug(slug: string | null): DecayCategoria | null {
  if (!slug) return null;
  if (SLUG_OVERRIDES[slug]) return SLUG_OVERRIDES[slug];
  if (slug.startsWith('phy_gym_')) return 'motor_explosivo';
  if (slug.startsWith('phy_physio_')) return 'motor_movilidad';
  if (slug.startsWith('phy_judo_')) return 'motor_explosivo';
  if (slug.startsWith('men_nerv_')) return 'habito_diario';
  if (slug.startsWith('men_focus_')) return 'habito_diario';
  if (slug.startsWith('men_read_')) return 'cognitivo_filosofico';
  if (slug.startsWith('prod_code_')) return 'tecnico_digital';
  if (slug.startsWith('prod_write_')) return 'creativo_produccion';
  if (slug.startsWith('disc_code_') || slug.startsWith('discipline_productive_coding')) {
    return 'tecnico_digital';
  }
  if (slug.startsWith('disc_write_') || slug.startsWith('discipline_productive_writing')) {
    return 'creativo_produccion';
  }
  if (slug.startsWith('disc_design_')) return 'tecnico_digital';
  if (slug.startsWith('disc_guitar_') || slug.startsWith('disc_piano_') || slug.startsWith('disc_lang_')) {
    return 'cognitivo_filosofico';
  }
  return null;
}

/** Resuelve categoría de decay Nen (persistida o inferida del catálogo). */
export function resolveDecayCategoria(node: SkillNode, allNodes: SkillNode[]): DecayCategoria {
  if (node.decayCategoria) return node.decayCategoria;

  const fromSlug = resolveFromSlug(node.slug);
  if (fromSlug) {
    if (node.colorRole === 'shared' && node.parentId) {
      const parent = allNodes.find((n) => n.id === node.parentId);
      if (parent) {
        const parentCat = resolveDecayCategoria(
          { ...parent, decayCategoria: parent.decayCategoria ?? null },
          allNodes
        );
        return fasterDecayCategory(fromSlug, parentCat);
      }
    }
    return fromSlug;
  }

  const vertiente = resolveVertienteId(node, allNodes);
  if (vertiente && VERTIENTE_DEFAULT[vertiente]) {
    return VERTIENTE_DEFAULT[vertiente];
  }

  return DEFAULT_DECAY_CATEGORIA;
}

export function decayCategoriaForSlug(slug: string): DecayCategoria {
  return resolveFromSlug(slug) ?? DEFAULT_DECAY_CATEGORIA;
}
