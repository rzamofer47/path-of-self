# Contexto: Path of Self — RPG Skill Tree

@AGENTS.md

App Expo (React Native + TypeScript) en `rpg-skill-tree/`.
Plan maestro y sprint: `../prompt.md` · Control: `PROJECT_PLAN.md`

## Qué es

Árbol de habilidades gamificado estilo Path of Exile 2: lienzo 2400×2400 con pan,
4 nodos raíz radiales, sub-habilidades custom, nodos guía sugeridos, XP, oxidación, skins RPG.

## Stack

- Expo ~56, expo-router, react-native-gesture-handler, react-native-reanimated, react-native-svg
- Persistencia: SQLite (native) / localStorage emulando SQL (web) — **NO Supabase en uso** sin `.env`
- Docs Expo: https://docs.expo.dev/versions/v56.0.0/

```bash
cd rpg-skill-tree
npx expo start --clear
```

## UI del árbol (NO tarjetas ni grid)

| Archivo | Rol |
|---------|-----|
| `app/(tabs)/index.tsx` | Pantalla principal + modal crear/forjar |
| `TreeCanvas.tsx` | Pan infinito, capas, gestos |
| `CustomNode.tsx` | Orbe + menú radial (+, ✦, i, ×) |
| `NodeRadialMenu.tsx` | Acciones en arco |
| `NodeInfoModal.tsx` | Info beneficio / cómo / grado / link |
| `OrbVisual.tsx` | Orbe SVG en capas + `decayRatio` visual |
| `TreeConnections.tsx` | Hilos padre→hijo, pulso si practicó <24h |
| `TreeSpaceBackground.tsx` | Fondo espacial PoE |

**Gestos:** pan en lienzo; `Gesture.Tap` en orbes (no Pressable suelto).

## 4 nodos raíz (`rootSeeds.ts`)

| slug | nombre | macroArea |
|------|--------|-----------|
| `root_fisica` | Forja del Cuerpo | physical |
| `root_intelectual` | Cámara del Intelecto | intellectual |
| `root_mental` | Santuario Interior | mental_emotional |
| `root_productiva` | Taller del Alquimista | productive |

Layer `root`: no editable/eliminable. Custom: `layer: 'custom'`, `parent_id`.

## Nodos guía (sugerencias virtuales)

- `getSuggestedGuideNodes()` en `queryEngine.local.ts`
- Aparecen en macro-áreas con ≤1 nodo custom (`guideSuggestions.ts`)
- Opacidad 0.5, menú `+` adopta como custom, `i` abre info
- IDs negativos (virtuales, no en DB)

## Datos y contenido

- `src/data/nodeInfoContent.ts` — info por slug o fallback por macroArea
- `src/data/guideSuggestions.ts` — sugerencias por área
- `src/data/titleMatrix.ts` — títulos compuestos (área decae + área crece)

## Geometría y colores

- Centro mapa: (1200, 1200) · Hijos: radio padre + 96px, abanico ±16° (`polarLayout.ts`)
- HSL hue base por macro-área; hijos ±20° por hermano (`nodeColors.ts`)
- `computeDecayRatio()` en `src/utils/decayRatio.ts` — salud visual del orbe

## Motor de juego

- **Oxidación:** intelectual 48h / -5% día; físico 5 días / -2% día
- **Físico:** máx. 4 sesiones/semana a XP completo; 5ª+ = 10% XP (`xp_excess` en log)
- **Escudo retención:** `getGraceMs()` ×2 si `user.retentionShield`
- **Títulos:** `useStatusEngine.ts` + títulos compuestos + legado [Oxidado]
- **Onboarding:** 5 preguntas → `generateProfileSummary()` visible en perfil

## Pantallas

- `index.tsx` — árbol
- `profile.tsx` — clase, constelaciones, resumen test, rangos
- `settings.tsx` — skins (fade al cambiar), recordatorios
- `onboarding.tsx` — cuestionario inicial

## Reglas al editar

- Cambios mínimos, seguir convenciones existentes
- No hardcodear nodos raíz; usar seeds/DB
- No romper hue-shift ni layout radial outward
- Probar en web tras cambios en SVG/gestos
- No crear commits salvo que se pida
