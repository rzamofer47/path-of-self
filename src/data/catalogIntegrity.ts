import { ROOT_SEEDS } from '@/src/database/rootSeeds';
import { NEN_MOTHER_SLUG_BY_ID } from '@/src/config/nenMotherRoots';
import { resolveNenAxisId } from '@/src/config/nenConfig';
import { SkillNode } from '@/src/types';
import { resolveParentNode } from '@/src/utils/nodeColors';
import { resolveHierarchyParent } from '@/src/utils/treeLayout';

import {
  buildSkillCatalogSeeds,
  CatalogNodeSeed,
  getCatalogParentSlug,
} from './skillCatalogSeeds';

export interface CatalogIntegrityIssue {
  level: 'error' | 'warning';
  slug?: string;
  message: string;
}

export interface CatalogIntegrityReport {
  ok: boolean;
  seedCount: number;
  errors: CatalogIntegrityIssue[];
  warnings: CatalogIntegrityIssue[];
}

const ROOT_SLUGS = new Set([
  ...ROOT_SEEDS.map((r) => r.slug),
  ...Object.values(NEN_MOTHER_SLUG_BY_ID),
]);

/** Verifica que el catálogo en código sea coherente (fuente de verdad). */
export function auditCatalogSeeds(
  seeds: CatalogNodeSeed[] = buildSkillCatalogSeeds()
): CatalogIntegrityReport {
  const errors: CatalogIntegrityIssue[] = [];
  const warnings: CatalogIntegrityIssue[] = [];
  const slugToSeed = new Map<string, CatalogNodeSeed>();

  for (const seed of seeds) {
    if (slugToSeed.has(seed.slug)) {
      errors.push({
        level: 'error',
        slug: seed.slug,
        message: `Slug duplicado en catálogo: ${seed.slug}`,
      });
    }
    slugToSeed.set(seed.slug, seed);
  }

  for (const seed of seeds) {
    if (!seed.parentSlug) {
      errors.push({
        level: 'error',
        slug: seed.slug,
        message: 'Falta parentSlug',
      });
      continue;
    }

    const parentInCatalog = slugToSeed.has(seed.parentSlug);
    const parentIsRoot = ROOT_SLUGS.has(seed.parentSlug);
    if (!parentInCatalog && !parentIsRoot) {
      errors.push({
        level: 'error',
        slug: seed.slug,
        message: `Padre no resuelto: ${seed.parentSlug}`,
      });
    }

    const cachedParent = getCatalogParentSlug(seed.slug);
    if (cachedParent !== seed.parentSlug) {
      errors.push({
        level: 'error',
        slug: seed.slug,
        message: `getCatalogParentSlug() (${cachedParent}) ≠ seed.parentSlug (${seed.parentSlug})`,
      });
    }
  }

  for (const seed of seeds) {
    if (seed.posX === 0 && seed.posY === 0) {
      warnings.push({
        level: 'warning',
        slug: seed.slug,
        message: 'Posición 0,0 — ¿falta layout sectorial?',
      });
    }
  }

  const mockNodes: SkillNode[] = [
    ...ROOT_SEEDS.map((root, index) => ({
      id: index + 1,
      slug: root.slug,
      name: root.name,
      type: root.type,
      layer: 'root' as const,
      macroArea: root.macroArea,
      xp: 0,
      level: 1,
      posX: root.posX,
      posY: root.posY,
      lastPracticeAt: null,
      weeklyXpSessions: 0,
      weekStartAt: null,
      dailyVerifiedAt: null,
      guideUrl: null,
      colorRole: 'critical' as const,
      parentId: null,
      originPosX: root.posX,
      originPosY: root.posY,
      isDeleted: false,
      decayCategoria: null,
      sessionQuality: null,
      sessionQualityHistory: null,
      createdAt: '',
    })),
    ...seeds.map((seed, index) => ({
      id: 1000 + index,
      slug: seed.slug,
      name: seed.name,
      type: seed.type,
      layer: 'locked' as const,
      macroArea: seed.macroArea,
      xp: 0,
      level: 1,
      posX: seed.posX,
      posY: seed.posY,
      lastPracticeAt: null,
      weeklyXpSessions: 0,
      weekStartAt: null,
      dailyVerifiedAt: null,
      guideUrl: seed.youtubeUrl ?? null,
      colorRole: seed.colorRole ?? 'standard',
      parentId: null,
      originPosX: seed.posX,
      originPosY: seed.posY,
      isDeleted: false,
      decayCategoria: null,
      sessionQuality: null,
      sessionQualityHistory: null,
      createdAt: '',
    })),
  ];

  for (const seed of seeds) {
    const node = mockNodes.find((n) => n.slug === seed.slug);
    if (!node) continue;

    const parent = resolveHierarchyParent(node, mockNodes);
    if (!parent) {
      errors.push({
        level: 'error',
        slug: seed.slug,
        message: 'resolveParentNode() no encuentra padre',
      });
      continue;
    }

    const expectedSlug = seed.parentSlug;
    if (parent.slug !== expectedSlug) {
      errors.push({
        level: 'error',
        slug: seed.slug,
        message: `Padre resuelto «${parent.slug}» ≠ esperado «${expectedSlug}»`,
      });
    }

    const axis = resolveNenAxisId(node, mockNodes);
    if (!axis && seed.generation === 0) {
      warnings.push({
        level: 'warning',
        slug: seed.slug,
        message: 'Vertiente gen-0 sin eje Nen',
      });
    }
  }

  return {
    ok: errors.length === 0,
    seedCount: seeds.length,
    errors,
    warnings,
  };
}

export function formatCatalogIntegrityReport(report: CatalogIntegrityReport): string {
  const lines: string[] = [
    `Catálogo: ${report.seedCount} nodos locked`,
    report.ok ? 'Estado: OK' : `Estado: FALLÓ (${report.errors.length} errores)`,
  ];

  if (report.errors.length > 0) {
    lines.push('', 'Errores:');
    for (const issue of report.errors) {
      lines.push(`  ✗ [${issue.slug ?? '?'}] ${issue.message}`);
    }
  }

  if (report.warnings.length > 0) {
    lines.push('', 'Advertencias:');
    for (const issue of report.warnings) {
      lines.push(`  ! [${issue.slug ?? '?'}] ${issue.message}`);
    }
  }

  return lines.join('\n');
}
