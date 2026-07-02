import { buildSkillCatalogSeeds } from '@/src/data/skillCatalogSeeds';
import { GUIDE_SUGGESTIONS } from '@/src/data/guideSuggestions';
import { SkillNode } from '@/src/types';

import {
  decodeYoutubeSearchQuery,
  resolveNodeYoutubeUrl,
} from './nodeYoutubeUrl';

export interface NodeGuideContent {
  beneficio: string | null;
  comoHacerlo: string;
  youtubeUrl: string | null;
}

function allGuideSuggestions() {
  return (Object.values(GUIDE_SUGGESTIONS) as (typeof GUIDE_SUGGESTIONS)[keyof typeof GUIDE_SUGGESTIONS][]).flat();
}

function findCatalogSeed(node: SkillNode) {
  const catalog = buildSkillCatalogSeeds();
  if (node.slug) {
    const bySlug = catalog.find((seed) => seed.slug === node.slug);
    if (bySlug) return bySlug;
  }
  const normalized = node.name.trim().toLowerCase();
  return catalog.find((seed) => seed.name.trim().toLowerCase() === normalized) ?? null;
}

function defaultComoHacerlo(node: SkillNode): string {
  if (node.type === 'physical') {
    return `Practica «${node.name}» con calidad sobre intensidad. Calienta 5 minutos, ejecuta series controladas y usa el videotutorial de YouTube para revisar la técnica antes de subir carga.`;
  }
  return `Dedica un bloque enfocado a «${node.name}». Completa la sesión con atención plena y marca tu check diario o registra XP al terminar.`;
}

function physicalComoHacerlo(name: string, youtubeUrl: string | null): string {
  const searchHint = youtubeUrl ? decodeYoutubeSearchQuery(youtubeUrl) : null;
  if (searchHint) {
    return `Realiza «${name}» con técnica segura. Mira el tutorial en YouTube («${searchHint}»), haz 2–4 series controladas y registra tu práctica al finalizar.`;
  }
  return `Realiza «${name}» con técnica segura. Consulta el videotutorial en YouTube, haz 2–4 series controladas y registra tu práctica al finalizar.`;
}

/** Texto guía + YouTube resueltos desde BD, catálogo y sugerencias por slug/nombre. */
export function resolveNodeGuideContent(node: SkillNode): NodeGuideContent {
  const youtubeFromDbOrCatalog = resolveNodeYoutubeUrl(node);

  if (node.slug) {
    const guide = allGuideSuggestions().find((entry) => entry.slug === node.slug);
    if (guide) {
      return {
        beneficio: guide.beneficio,
        comoHacerlo: guide.comoHacerlo,
        youtubeUrl: youtubeFromDbOrCatalog ?? guide.guideUrl ?? null,
      };
    }
  }

  const catalogSeed = findCatalogSeed(node);
  const youtubeUrl =
    youtubeFromDbOrCatalog ?? catalogSeed?.youtubeUrl?.trim() ?? null;

  if (catalogSeed) {
    return {
      beneficio:
        catalogSeed.type === 'physical'
          ? `Fortalece tu progresión en ${catalogSeed.name} dentro de la Forja del Cuerpo.`
          : `Desarrolla ${catalogSeed.name} en tu árbol de habilidades.`,
      comoHacerlo:
        catalogSeed.type === 'physical'
          ? physicalComoHacerlo(catalogSeed.name, youtubeUrl)
          : youtubeUrl
            ? `Practica «${catalogSeed.name}». Usa el enlace de YouTube para ver cómo hacerlo y aplica lo aprendido en una sesión corta hoy.`
            : defaultComoHacerlo({ ...node, name: catalogSeed.name, type: catalogSeed.type }),
      youtubeUrl,
    };
  }

  if (youtubeUrl) {
    const searchHint = decodeYoutubeSearchQuery(youtubeUrl);
    return {
      beneficio: null,
      comoHacerlo: searchHint
        ? `Practica «${node.name}». En YouTube busca «${searchHint}», sigue la técnica del vídeo y marca tu check al completar la sesión.`
        : defaultComoHacerlo(node),
      youtubeUrl,
    };
  }

  return {
    beneficio: null,
    comoHacerlo: defaultComoHacerlo(node),
    youtubeUrl: null,
  };
}
