import { WILDCARD_PLACEHOLDER_NAME } from '@/src/data/disciplineCatalog';
import { SkillNode } from '@/src/types';

const WILDCARD_SLUG_PREFIX = 'wildcard_';

export function wildcardSlugForArea(macroArea: SkillNode['macroArea']): string {
  return `${WILDCARD_SLUG_PREFIX}${macroArea}`;
}

export function isWildcardNode(node: SkillNode): boolean {
  return node.layer === 'wildcard';
}

export function isConfiguredWildcard(node: SkillNode): boolean {
  return (
    node.layer === 'custom' &&
    typeof node.slug === 'string' &&
    node.slug.startsWith(WILDCARD_SLUG_PREFIX)
  );
}

export function isUnconfiguredWildcard(node: SkillNode): boolean {
  return isWildcardNode(node);
}

export function getWildcardDisplayName(node: SkillNode): string {
  if (isUnconfiguredWildcard(node)) return WILDCARD_PLACEHOLDER_NAME;
  return node.name;
}
