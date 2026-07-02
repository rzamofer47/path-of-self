import { buildSkillCatalogSeeds } from '../src/data/skillCatalogSeeds';
import { resolveVertienteId } from '../src/config/nenConfig';
import { SkillNode } from '../src/types';

const seeds = buildSkillCatalogSeeds();
const nodes: SkillNode[] = seeds.map((s, i) => ({
  id: i,
  slug: s.slug,
  name: s.name,
  type: s.type,
  layer: 'locked',
  macroArea: s.macroArea,
  xp: 0,
  level: 1,
  posX: s.posX,
  posY: s.posY,
  lastPracticeAt: null,
  weeklyXpSessions: 0,
  weekStartAt: null,
  dailyVerifiedAt: null,
  guideUrl: null,
  colorRole: null,
  parentId: null,
  originPosX: null,
  originPosY: null,
  isDeleted: false,
  createdAt: '',
}));

const g1 = seeds.filter((seed) => {
  const mock = nodes.find((n) => n.slug === seed.slug)!;
  const v = resolveVertienteId(mock, nodes);
  return v === 'gimnasio' && (seed.generation ?? 0) === 1;
});

console.log('gimnasio gen1 count', g1.length);
g1.forEach((s) => console.log(' ', s.slug, 'gen', s.generation));
