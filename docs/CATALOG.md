# Catálogo de nodos — fuente de verdad

Los arreglos de nodos (jerarquía, nombres, posiciones, URLs) **no viven en la base de datos** como fuente principal. Viven en **código versionado con git**.

## Dónde editar (y dónde no)

| Qué | Archivos correctos |
|-----|-------------------|
| Nodos del catálogo (Gimnasio, Coding, hijos…) | `src/data/*GalaxyCatalog.ts`, `src/data/disciplineCatalog.ts` |
| Posiciones y `parentSlug` | `src/data/skillCatalogSeeds.ts` (layout automático) |
| Raíces Nen (hexágono central) | `src/config/nenMotherRoots.ts`, `src/database/rootSeeds.ts` |
| Resolución padre → hijo en runtime | `src/utils/nodeColors.ts` → `resolveParentNode()` |
| Sync al arrancar (local) | `src/database/catalogSeeds.ts` → `syncCatalogNodes()` |
| Sync nube (Supabase) | `src/database/supabaseCatalogSync.ts` |

**Evitar** meter datos de catálogo en `TreeCanvas.tsx`, componentes UI o parches solo en SQLite/Supabase sin actualizar los seeds.

## Qué se preserva al actualizar la app

- **`layer: 'locked'`** — al abrir la app, `syncCatalogNodes` reaplica nombre, posición, `parent_id` y URL desde los seeds.
- **`layer: 'custom'`** (nodo ya activado con check) — **no se sobrescribe** el catálogo; se conserva progreso (XP, checks, nombre custom).
- **Progreso del usuario** — `daily_verified_at`, `xp`, `level` no los pisa el sync de catálogo.

## Cómo no perder trabajo

1. **Commit en git** después de arreglar el catálogo:
   ```bash
   git add src/data/ src/utils/nodeColors.ts src/database/catalogSeeds.ts
   git commit -m "fix(catalog): jerarquía y padres coding/gimnasio"
   ```

2. **Verificar antes de mergear** otro fix:
   ```bash
   npm run verify:catalog
   ```
   Falla si hay slugs duplicados, padres rotos o `resolveParentNode` incorrecto (p. ej. productive → raíz equivocada).

3. **No hacer `git restore src/`** masivo sin revisar — eso borró archivos en el pasado.

4. **Cambios de UI** (menú, líneas, pinch) en `src/components/tree/` — separados del catálogo; no deberían pisar seeds salvo que se editen archivos equivocados.

## Checklist al tocar nodos

- [ ] Edité solo archivos de `src/data/` o sync relacionado
- [ ] `npm run verify:catalog` pasa
- [ ] Probé check + líneas en 1 nodo físico y 1 productivo (p. ej. Gimnasio, React Native Fundamentos)
- [ ] Commit descriptivo en git
