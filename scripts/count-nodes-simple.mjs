// Count nodes from catalog definitions
function countBranch(counts) {
  return 1 + counts.reduce((s, n) => s + n, 0);
}

const gimnasio = [3,4,3,3,4,1];
const judo = [5,8,7,4,2,1];
const fisio = [3,3,3,1,2,1];
const physical = countBranch(gimnasio) + countBranch(judo) + countBranch(fisio);

const nervioso = [1,3,2,1,2,1];
const enfoque = [1,3,1,1,1,1];
const lectura = [1,3,1,1,1,1];
const mental = countBranch(nervioso) + countBranch(enfoque) + countBranch(lectura);

const coding = [3,3,3,3,1,1];
const writing = [3,3,3,3,1,1];
const productive = countBranch(coding) + countBranch(writing);

const intellectual = 3 + 9 + 2; // hubs + children + guides

const roots = 6;
const wildcards = 4;
const catalog = physical + mental + productive + intellectual;
const total = catalog + roots + wildcards;

console.log(JSON.stringify({
  physical,
  mental_emotional: mental,
  productive,
  intellectual,
  catalogLocked: catalog,
  roots,
  wildcards,
  totalBase: total,
}, null, 2));
