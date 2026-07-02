# RPG Skill Tree — Plan de Control

## Modo actual: Local (sin `.env`)

Sin Supabase ni Vercel. Todo funciona con almacenamiento local.

## Ejecutar

```bash
cd rpg-skill-tree
npx expo start --clear
```

- **Web:** http://localhost:8081 (localStorage)
- **Móvil:** Expo Go + QR (SQLite)

## Checklist plan maestro

| Feature | Estado |
|---------|--------|
| Onboarding 5 preguntas → calibra XP/degradación | ✅ |
| 3 skins (RPG, Cyberpunk, Minimal) | ✅ |
| Árbol custom (+) + 4 nodos raíz PoE | ✅ |
| Oxidación intelectual / física | ✅ |
| Motor de títulos + legado [Oxidado] | ✅ |
| Vista 2D avanzada (pan, SVG, minimapa) | ✅ |
| Perfil con stats del test | ✅ |
| Recordatorios de práctica (móvil) | ✅ |

## Sprint Pulido General (prompt.md) — ✅ Completado

| Tarea | Estado |
|-------|--------|
| A1 — Glow animado en conexiones activas | ✅ |
| A2 — Saturación según decayRatio en orbes | ✅ |
| A3 — Transición de skin sin flash | ✅ |
| B1 — Modal de info (beneficio / cómo / grado) | ✅ |
| B2 — Nodos guide como sugerencias activas | ✅ |
| B3 — Botón "Ver cómo" con link externo | ✅ |
| C1 — Matriz de títulos compuestos | ✅ |
| C2 — Tope 4 sesiones/semana físicos (10% XP exceso) | ✅ |
| C3 — Escudo de retención consistente | ✅ |
| D1 — Notificaciones de oxidación por nodo | ✅ |
| D2 — Constelaciones en perfil | ✅ |
| D3 — Resumen de perfil post-onboarding | ✅ |

## Fase 2: Conexiones Curvas (Arcos SVG en Órbitas)

| Tarea | Estado |
|-------|--------|
| E1 — Sustituir líneas rectas por `<path>` SVG en conexiones | ✅ |
| E2 — Arcos curvos para nodos en la misma órbita | ✅ |
| E3 — Líneas rectas o bezier suave para padre-hijo | ✅ |
| E4 — Refactorizar y asegurar no romper referencias de nodos | ✅ |

## Fase 3: Clusters Geométricos (Patrones Fijos de Hermanos)

| Tarea | Estado |
|-------|--------|
| F1 — Implementar patrones geométricos para hijos (2, 3, 4 hijos) | ✅ |
| F2 — Añadir margen de "aire" entre diferentes clusters | ✅ |
| F3 — Ajustar distribución angular de nodos hermanos | ✅ |

## Fase 4: Hub Central Decorativo

| Tarea | Estado |
|-------|--------|
| G1 — Renderizar 2 o 3 círculos concéntricos SVG en el centro | [ ] |
| G2 — Añadir líneas tenues (opacity: 0.2) y efecto de brillo difuminado | [ ] |
| G3 — Implementar diseño visual geométrico decorativo (runas/núcleo) | [ ] |
| G4 — Asegurar que no se rompan referencias ni estado de activación | [ ] |

## Fase 5: Integración y Persistencia (Supabase/Vercel)

| Tarea | Estado |
|-------|--------|
| H1 — Configurar entorno de desarrollo con Supabase | [ ] |
| H2 — Migración de datos locales a Supabase | [ ] |
| H3 — Autenticación de usuarios | [ ] |
| H4 — Despliegue en Vercel | [ ] |
| H5 — Sincronización en tiempo real | [ ] |
