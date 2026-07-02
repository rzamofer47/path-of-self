import { buildSkillCatalogSeeds } from '@/src/data/skillCatalogSeeds';
import { GUIDE_SUGGESTIONS } from '@/src/data/guideSuggestions';
import { SkillNode } from '@/src/types';

const YOUTUBE_HOSTS = ['youtube.com', 'youtu.be', 'm.youtube.com'];

export function isYoutubeUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return YOUTUBE_HOSTS.some((host) => lower.includes(host));
}

/** URL de YouTube en `guide_url` / `guideUrl` del nodo persistido. */
export function getNodeYoutubeUrl(node: Pick<SkillNode, 'guideUrl'>): string | null {
  const raw = node.guideUrl?.trim();
  if (!raw || !isYoutubeUrl(raw)) return null;
  return raw;
}

let catalogYoutubeBySlug: Map<string, string> | null = null;
let catalogYoutubeByName: Map<string, string> | null = null;

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function ensureCatalogMaps(): void {
  if (catalogYoutubeBySlug && catalogYoutubeByName) return;

  catalogYoutubeBySlug = new Map();
  catalogYoutubeByName = new Map();

  for (const seed of buildSkillCatalogSeeds()) {
    if (!seed.youtubeUrl || !isYoutubeUrl(seed.youtubeUrl)) continue;
    catalogYoutubeBySlug.set(seed.slug, seed.youtubeUrl);
    catalogYoutubeByName.set(normalizeName(seed.name), seed.youtubeUrl);
  }
}

function getCatalogYoutubeBySlug(slug: string | null): string | null {
  if (!slug) return null;
  ensureCatalogMaps();
  return catalogYoutubeBySlug!.get(slug) ?? null;
}

function getCatalogYoutubeByName(name: string | null): string | null {
  if (!name) return null;
  ensureCatalogMaps();
  return catalogYoutubeByName!.get(normalizeName(name)) ?? null;
}

/**
 * YouTube del nodo: BD (`guideUrl`) → catálogo por slug → catálogo por nombre.
 */
export function resolveNodeYoutubeUrl(
  node: Pick<SkillNode, 'guideUrl' | 'slug' | 'name'>
): string | null {
  return (
    getNodeYoutubeUrl(node) ??
    getCatalogYoutubeBySlug(node.slug) ??
    getCatalogYoutubeByName(node.name)
  );
}

export function decodeYoutubeSearchQuery(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('youtube')) return null;
    const query = parsed.searchParams.get('search_query');
    if (!query) return null;
    return decodeURIComponent(query.replace(/\+/g, ' '));
  } catch {
    return null;
  }
}
