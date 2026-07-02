import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

// Use tsx if available, else approximate from compiled logic
async function main() {
  try {
    const { register } = await import('tsx/esm/api');
    register();
    const mod = await import(pathToFileURL(path.join(root, 'src/data/skillCatalogSeeds.ts')).href);
    const wildcard = await import(pathToFileURL(path.join(root, 'src/data/wildcardSeeds.ts')).href);
    const roots = await import(pathToFileURL(path.join(root, 'src/database/rootSeeds.ts')).href);

    const catalog = mod.buildSkillCatalogSeeds();
    const wildcards = wildcard.WILDCARD_SEEDS.length;
    const rootCount = roots.ROOT_SEEDS.length;

    console.log('Nodos madre (raíz Nen):', rootCount);
    console.log('Catálogo locked (buildSkillCatalogSeeds):', catalog.length);
    console.log('Wildcards:', wildcards);
    console.log('TOTAL base en árbol:', rootCount + catalog.length + wildcards);

    const byArea = {};
    for (const s of catalog) {
      byArea[s.macroArea] = (byArea[s.macroArea] ?? 0) + 1;
    }
    console.log('Catálogo por macro-área:', byArea);
  } catch (e) {
    console.error('tsx import failed:', e.message);
    process.exit(1);
  }
}

main();
