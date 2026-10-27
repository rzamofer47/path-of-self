# RPG Skill Tree — Plan de Control
> **Path of Self** · Expo ~56 + React Native + TypeScript · Local-first (sin `.env` activo)

---

## ⚡ Ejecutar

```bash
cd rpg-skill-tree
npx expo start --clear
```

- **Web:** http://localhost:8081 (localStorage)
- **Móvil:** Expo Go + QR (SQLite)

---

## 🔒 Regla de Arquitectura del Árbol — LEER ANTES DE TOCAR CATÁLOGOS

**Cada slug de habilidad, hub o nodo de catálogo pertenece a UN SOLO vértice Nen y UNA SOLA rama hub. Nunca puede existir en dos ejes a la vez.**

El `parentSlug` en el catálogo es la única fuente de verdad — no el nombre, no el tipo, no la macroArea.

### Tabla de desambiguación (casos con afinidad a múltiples vértices)

| Habilidad | Vértice correcto | Vértice incorrecto (no usar) | Razón |
|---|---|---|---|
| `ingles` / idioma | `transformation` (El Gran Transmutador) | `specialization` | Es aprendizaje activo, no lectura pasiva |
| Pomodoro / bloques de enfoque | `manipulation` (El Estratega) | `specialization` | Es gestión de tiempo, no filosofía |
| Escritura creativa / novela | `specialization` (El Filósofo) | `emission` | Es reflexión interna, no contenido para audiencia |
| Guiones / posts / YouTube | `emission` (El Emisario) | `specialization` | Es proyección externa, no reflexión |
| Respiración / regulación nerviosa | `specialization` (El Filósofo) | `intensification` | Es gestión mental, no rendimiento físico |
| Fisioterapia | `intensification` (Forja del Guerrero) | cualquier otro | Es blindaje del cuerpo físico |
| Psicología / DBT | `specialization` (El Filósofo) | `transformation` | Es conocimiento aplicado propio, no habilidad nueva |
| Ebooks / productos digitales | `materialization` (El Arquitecto) | `emission` | Es crear el producto, no distribuirlo |
| Subir videos / redes | `emission` (El Emisario) | `materialization` | Es distribución, no producción |
| Inversiones ETF | `manipulation` (El Estratega) | `transformation` | Es control de sistemas financieros, no aprendizaje de habilidad |

### Cuando Cursor detecte un slug en el lugar incorrecto:
1. Cambiar su `parentSlug` al hub correcto según esta tabla
2. Agregar el slug viejo a `LEGACY_*_LOCKED_SLUGS` del archivo correspondiente
3. NO crear el slug nuevo en el lugar correcto si ya existe — solo reasignar el padre

---

## 🌌 Arquitectura del Árbol Nen (Fuente de Verdad)

### Los 6 Vértices — Hexágono Central

| ID interno (no cambiar) | Nombre visible | Dominio de vida |
|---|---|---|
| `intensification` | **Forja del Guerrero** | Gym + Judo + Fisioterapia |
| `transformation` | **El Gran Transmutador** | Inglés clínico + instrumento musical + nueva habilidad |
| `materialization` | **El Arquitecto** | Apps + productos digitales + clientes web |
| `emission` | **El Emisario** | Canales + contenido + presencia digital |
| `manipulation` | **El Estratega** | Inversiones ETF + gestión de recursos y tiempo |
| `specialization` | **El Filósofo** | Lectura + estoicismo + psicología + novela |

> **Importante:** Los slugs internos (`intensification`, `transformation`, etc.) y las posiciones en hexágono NO se tocan. Solo cambian los `name` visibles.

---

### 🔴 Vértice 1 — Forja del Guerrero (`intensification`)
*"El cuerpo es el primer campo de batalla."*

**Hub: Gimnasio** (`discipline_physical_gimnasio`) → padre: `root_intensificacion`
```
G1: Técnicas Base (Sentadilla, Peso Muerto, Press)
G2: Construcción de Volumen (series, descanso, nutrición básica)
G3: Fuerza Progresiva (periodización, 1RM, sobrecarga)
G4: Composición Corporal (déficit/superávit, mediciones)
G5: ★ Atleta Funcional [crítico]
```

**Hub: Judo** (`discipline_physical_judo`) → padre: `root_intensificacion`
```
J1: Fundamentos (Ukemi, Kuzushi, Reiho, postura)
J2: Técnicas de Pie Gokyo (De-Ashi, O-Goshi, Seoi-Nage)
J3: Ne-Waza (suelo, inmovilizaciones, estrangulaciones)
J4: Competencia y Randori libre
J5: ★ Shodan — Cinturón Negro [crítico]
```

**Hub: Fisioterapia** (`discipline_physical_fisioterapia`) → padre: `root_intensificacion`
```
F1: Movilidad Base (caderas, hombros, tobillo)
F2: Activación y Estabilización (core, escápulas, glúteos)
F3: Prevención de Lesiones Específicas (rodilla, lumbar, muñeca)
F4: ★ Cuerpo Antifrágil [crítico, shared con J4]
```

---

### 🟡 Vértice 2 — El Gran Transmutador (`transformation`)
*"Convertir tiempo en competencia."*

**Hub: Inglés Clínico** (`discipline_transformation_ingles`) → padre: `root_transformacion`
```
E1: Monitoreo de Brechas y Vocabulario Clínico (glosario BREM/CRPO)
E2: Desglose Fonético y Shadowing en Solitario
E3: Análisis de Casos y Matices Culturales (Ontario)
E4: Pensamiento Clínico Escrito sin Traducción Interna
E5: ★ Identidad Profesional Bilingüe [crítico]
```

**Hub: Instrumento Musical** (`discipline_transformation_instrumento`) → padre: `root_transformacion`
```
N1: Sintonía Física (conexión ojo-mano-instrumento)
N2: Resistencia a la Frustración (práctica deliberada en pasajes difíciles)
N3: Ejecución Fluida (tocar bajo presión / cámara)
N4: Oído Relativo y Conexión auditiva-motora
N5: ★ Conexión Transmutada — Estado de Flow [crítico]
```

**Hub: Meditación y Presencia** (`discipline_transformation_meditacion`) → padre: `root_transformacion`
```
M1: Anclaje de la Atención (5-10 min diarios consistentes)
M2: Monitoreo del Diálogo Interno (autoconsciencia)
M3: Presencia bajo Estímulos (atención sostenida activa)
M4: Descompresión del Sistema Nervioso (respiración / body scan)
M5: ★ Mente Antifrágil y Centrada [crítico]
```

---

### 🟠 Vértice 3 — El Arquitecto (`materialization`)
*"Del código a la caja registradora."*

**Hub: Factoría de Productos Digitales** (`discipline_materialization_productos`) → padre: `root_materializacion`
```
P1: El Plano del Arquitecto (índice / guion / estructura)
P2: Ensamblaje y Activos Visuales (producción base)
P3: El Producto Terminado (masterización y exportación)
P4: Automatización del Delivery (plataforma de distribución)
P5: ★ El Creador Prolífico [crítico]
```

**Hub: Agencia Web / Clientes** (`discipline_materialization_clientes`) → padre: `root_materializacion`
```
C1: Perfil de Oferta Irresistible (vitrina y portafolio)
C2: Mapeo de Prospectos (lista de 20-30 negocios locales)
C3: El Primer Contacto (cold outreach — 10-15 mensajes)
C4: Propuesta y Negociación (llamada + cotización formal)
C5: ★ Contrato Cerrado — Primer Cliente Web [crítico]
```

---

### 🔵 Vértice 4 — El Emisario (`emission`)
*"Si nadie te ve, no existes."*

**Hub: Contenido de Video** (`discipline_emission_video`) → padre: `root_emision`
```
V1: Primer Video Publicado (cualquier canal)
V2: Consistencia — 8 videos publicados
V3: Optimización SEO y thumbnails
V4: Primer Video con 1K+ vistas orgánicas
V5: ★ Canal con Audiencia Propia [crítico]
```

**Hub: Presencia Digital** (`discipline_emission_presencia`) → padre: `root_emision`
```
D1: Identidad de marca definida (logo, colores, voz)
D2: Web/portfolio activo y actualizado
D3: Red social con 500+ seguidores reales
D4: ★ Marca Personal Reconocible [crítico, shared con V4]
```

---

### 🟢 Vértice 5 — El Estratega (`manipulation`)
*"Controla los sistemas, no solo el esfuerzo."*

**Hub: Inversiones ETF** (`discipline_manipulation_inversiones`) → padre: `root_manipulacion`
```
I1: Fundamentos (qué es un ETF, índices, riesgo)
I2: Primera cuenta de inversión abierta
I3: Primer aporte real (aunque sea $50 CAD)
I4: Estrategia DCA activa (aportes regulares)
I5: ★ Portafolio Diversificado Activo [crítico]
```

**Hub: Gestión de Recursos y Tiempo** (`discipline_manipulation_recursos`) → padre: `root_manipulacion`
```
R1: Presupuesto mensual real documentado
R2: Sistema de productividad personal (bloques, prioridades)
R3: Fondo de emergencia (3 meses de gastos)
R4: ★ Arquitecto de su Propio Tiempo [crítico]
```

---

### ⚪ Vértice 6 — El Filósofo (`specialization`)
*"Quien se conoce a sí mismo no puede ser derrotado."*

**Hub: Lectura y Asimilación** (`discipline_specialization_lectura`) → padre: `root_especializacion`
```
L1: Hábito de lectura diaria (15 min mínimo)
L2: Sistema de notas y retención (Zettelkasten básico)
L3: 12 libros leídos y asimilados en el año
L4: ★ Lector Activo [crítico]
```

**Hub: Filosofía Práctica** (`discipline_specialization_filosofia`) → padre: `root_especializacion`
```
S1: Dicotomía del Control (práctica diaria)
S2: Regulación emocional y sistema nervioso
S3: Aplicación clínica — DBT y psicología positiva
S4: Escritura reflexiva (novela, journaling, ensayo)
S5: ★ Perspectiva Inquebrantable [crítico]
```

---

## 🎮 Reglas de Progresión RPG

1. **Cada nodo requiere el anterior** — `prerequisiteSlug` en `CatalogNodeSeed`. El nodo se muestra bloqueado (opacidad 0.3) hasta que el prerequisito tenga `xp > 0`.
2. **Nodos críticos ★** son hitos de área — desbloquean tags de título en `useStatusEngine`.
3. **Nodos shared** (`colorRole: 'shared'`) conectan dos vértices — representan sinergias reales.
4. **El hub "Instrumento Musical"** es renombrable por el usuario — diseñado así para adaptarse a cualquier instrumento o habilidad nueva.

---

## ✅ Historial de Features Completadas

### Plan Maestro Base
| Feature | Estado |
|---|---|
| Onboarding 5 preguntas → calibra XP/degradación | ✅ |
| 3 skins (RPG, Cyberpunk, Minimal) | ✅ |
| Árbol custom (+) + nodos raíz hexágono Nen | ✅ |
| Oxidación intelectual / física diferenciada | ✅ |
| Motor de títulos + legado [Oxidado] | ✅ |
| Vista 2D avanzada (pan, SVG, minimapa) | ✅ |
| Perfil con stats del test | ✅ |
| Recordatorios de práctica (móvil) | ✅ |

### Sprint Pulido General
| Tarea | Estado |
|---|---|
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

### Fase 2: Conexiones Curvas
| Tarea | Estado |
|---|---|
| E1 — Sustituir líneas rectas por `<path>` SVG | ✅ |
| E2 — Arcos curvos para nodos en la misma órbita | ✅ |
| E3 — Líneas rectas o bezier suave para padre-hijo | ✅ |
| E4 — Refactorizar sin romper referencias de nodos | ✅ |

### Fase 3: Clusters Geométricos
| Tarea | Estado |
|---|---|
| F1 — Patrones geométricos para hijos (2, 3, 4 hijos) | ✅ |
| F2 — Margen de aire entre clusters | ✅ |
| F3 — Distribución angular de nodos hermanos | ✅ |

---

## 🚧 Pendiente

### Fase 4: Hub Central Decorativo
| Tarea | Estado |
|---|---|
| G1 — 2-3 círculos concéntricos SVG en el centro | [ ] |
| G2 — Líneas tenues (opacity 0.2) y glow difuminado | [ ] |
| G3 — Diseño geométrico decorativo (runas/núcleo) | [ ] |
| G4 — Sin romper referencias ni estado de activación | [ ] |

### Fase 5: Rediseño del Árbol Nen (este documento)
| Tarea | Estado |
|---|---|
| X1 — Cambiar `name` de 6 vértices en `nenMotherRoots.ts` | [x] |
| X2 — Reescribir `physicalGalaxyCatalog.ts` con nueva progresión | [x] |
| X3 — Reescribir `mentalEmotionalGalaxyCatalog.ts` | [x] |
| X4 — Reescribir `manipulationGalaxyCatalog.ts` | [x] |
| X5 — Reescribir `productiveGalaxyCatalog.ts` | [x] |
| X6 — Crear `transformationGalaxyCatalog.ts` (nuevo) | [x] |
| X7 — Agregar `prerequisiteSlug` a `CatalogNodeSeed` | [x] |
| X8 — Limpiar slugs legacy en todos los `LEGACY_*_LOCKED_SLUGS` | [x] |
| X9 — Reparar nodos huérfanos con `repairOrphanedNodes()` | [x] |

### Fase 6: Integración y Persistencia (Supabase/Vercel)
| Tarea | Estado |
|---|---|
| H1 — Configurar entorno con Supabase | [ ] |
| H2 — Migración de datos locales a Supabase | [ ] |
| H3 — Autenticación de usuarios | [ ] |
| H4 — Despliegue en Vercel | [ ] |
| H5 — Sincronización en tiempo real | [ ] |

---

## 📁 Archivos clave del catálogo

| Archivo | Rol |
|---|---|
| `src/config/nenMotherRoots.ts` | 6 vértices Nen — nombres, slugs, posiciones, paletas |
| `src/database/rootSeeds.ts` | Seeds de los 6 nodos madre |
| `src/data/skillCatalogSeeds.ts` | Orquestador principal — llama a todos los builders |
| `src/data/physicalGalaxyCatalog.ts` | Ramas: gimnasio, judo, fisioterapia |
| `src/data/transformationGalaxyCatalog.ts` | Ramas: inglés clínico, instrumento, meditación |
| `src/data/mentalEmotionalGalaxyCatalog.ts` | Ramas: lectura, filosofía práctica |
| `src/data/manipulationGalaxyCatalog.ts` | Ramas: inversiones, recursos |
| `src/data/productiveGalaxyCatalog.ts` | Ramas: productos, clientes |
| `src/data/guideSuggestions.ts` | Sugerencias por macroArea (capa guide) |
| `src/data/disciplineCatalog.ts` | Catálogo legacy (no eliminar sin verificar) |

## ⚠️ Lo que NO hacer (reglas permanentes)

- No volver a tarjetas, grid o lista para el árbol
- No eliminar ni editar nodos root / vértices Nen
- No hardcodear nodos raíz en UI — usar seeds/DB
- No asumir Supabase activo sin `.env`
- No añadir features no pedidas (tests, abstracciones, docs extra)
- No romper: hue-shift de colores, expansión radial outward, conexiones raíz→hijo
- No crear commits salvo que se pida explícitamente
- No poner un slug en dos vértices distintos — ver tabla de desambiguación arriba