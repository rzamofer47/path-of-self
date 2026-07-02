import { buildSkillCatalogSeeds } from '../src/data/skillCatalogSeeds';
import { SkillNode } from '../src/types';
import {
  auditNodesOutsideSector,
  verifySectorMigration,
} from '../src/utils/nodeSectorLayout';

const seeds = buildSkillCatalogSeeds();
const nodes: SkillNode[] = seeds.map((seed, index) => ({
  id: index + 1,
  slug: seed.slug,
  name: seed.name,
  type: seed.type,
  layer: 'locked',
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
  originPosX: null,
  originPosY: null,
  isDeleted: false,
  createdAt: '',
}));

const audit = auditNodesOutsideSector(nodes);
console.log('=== Auditoría sectorial (catálogo recalculado) ===');
console.log('Nodos fuera de sector (±25°):', audit.length);
audit.slice(0, 25).forEach((row) => {
  console.log(
    `- ${row.name} | macro=${row.macroArea} | vertiente=${row.vertienteId} | sector actual=${row.physicalSectorLabel} | Δ${row.deltaDeg}°`
  );
});

const verify = verifySectorMigration(nodes);
console.log('\n=== Verificación post-layout ===');
console.log('Fuera de sector:', verify.outOfSector.length);
console.log('Gen1 demasiado cerca:', verify.gen1TooClose.length);
console.log('Hermanos demasiado cerca:', verify.siblingTooClose.length);
console.log('OK:', verify.ok);
