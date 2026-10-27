# Prompt Sprint Final — Backup con Supabase, Hatsu Visual y Onboarding

Contexto: la app está operativa con todas las funciones principales implementadas. Este es el sprint de cierre que cubre los tres puntos pendientes para considerar la V1 completa. Son tres bloques independientes — si uno falla no afecta a los otros, trabájalos en orden pero sin mezclarlos.

---

## BLOQUE 1 — Backup y Sincronización con Supabase

### Objetivo
El progreso del usuario (XP, niveles, rachas, checks, historial de Nen) vive solo en SQLite local. Si el usuario cambia de dispositivo, reinstala la app o pierde el teléfono, pierde todo. Este bloque añade sincronización con Supabase como respaldo en la nube.

### Contexto técnico
El proyecto ya usa Supabase en otros módulos (misma instancia que Luminia si están en el mismo proyecto, o una instancia propia de Path of Self — confirma cuál antes de continuar). Las credenciales ya deberían estar en las variables de entorno del proyecto.

### Tablas a crear en Supabase (si no existen)
```sql
-- Progreso de nodos del usuario
create table node_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  node_id text not null,
  nivel integer default 0,
  xp integer default 0,
  last_check_date timestamptz,
  streak_current integer default 0,
  streak_max integer default 0,
  is_deleted boolean default false,
  updated_at timestamptz default now(),
  unique(user_id, node_id)
);

-- Historial diario del Nen
create table nen_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  fecha date not null,
  intensificacion numeric default 0,
  manipulacion numeric default 0,
  emision numeric default 0,
  materializacion numeric default 0,
  transformacion numeric default 0,
  especializacion numeric default 0,
  unique(user_id, fecha)
);
```

Habilita RLS en ambas tablas con política: el usuario solo puede leer y escribir sus propios registros.

### Lógica de sincronización
1. **Sincronización al abrir la app:** al iniciar, compara el `updated_at` de los registros locales (SQLite) con los de Supabase. El registro más reciente gana — nunca borres progreso local que sea más nuevo que la nube.
2. **Sincronización al cerrar o pasar a background:** guarda en Supabase todo lo que cambió en la sesión actual. Usa `upsert` con `updated_at` para evitar conflictos.
3. **Modo offline:** si no hay conexión, la app funciona 100% con SQLite local y sincroniza la próxima vez que haya internet. Nunca bloquees la UI esperando respuesta de Supabase.
4. **Botón de respaldo manual:** en el menú de configuración existente, añade un botón "Sincronizar ahora" que fuerza la sincronización y muestra confirmación ("Progreso guardado en la nube ✓") o error con reintento.
5. **Exportar JSON:** también en configuración, un botón "Exportar progreso" que genera un archivo JSON con todo el progreso local y lo comparte mediante el share sheet nativo del dispositivo (usando `expo-sharing`). Backup offline sin depender de Supabase.

### Lo que NO sincroniza Supabase
La configuración del árbol (nodos, posiciones, estructura de ramas) viene del código (`rootSeeds.ts`, `disciplineCatalog.ts`) — no de la base de datos del usuario. Solo sincroniza el progreso del usuario sobre esa estructura fija.

---

## BLOQUE 2 — Hatsu Visual (Firma de Aura por Tipo de Nen Dominante)

### Objetivo
El radar chart ya calcula cuál es el tipo de Nen dominante del usuario (el eje con el valor más alto en `getSmoothedNenProfile()`). Ahora ese tipo dominante debe expresarse visualmente en los orbes del mapa — los destellos y auras adoptan la firma visual del tipo de Nen del usuario.

### Implementación

**Paso 1 — Leer el tipo dominante**
Crea una función `getNenDominante(): NenTipo` que llame a `getSmoothedNenProfile()` y devuelva el eje con el valor más alto. Si hay empate, el primero en orden del array gana.

**Paso 2 — Firmas visuales por tipo**
Define un objeto `NEN_FIRMAS` con la firma visual de cada tipo. Cada firma tiene:
- `colorAura`: el color del resplandor neón del Check activo (sobrescribe el color de macro-área para los nodos activos)
- `patternDestello`: cómo se comporta el destello de XP al subir de nivel
- `velocidadPulso`: velocidad del pulso del aura (en ms)

```typescript
const NEN_FIRMAS = {
  intensificacion: {
    colorAura: '#00FF88',        // Verde vibrante
    patternDestello: 'cruz',     // Cruz de 4 puntas (el actual)
    velocidadPulso: 800,         // Pulso rápido, potente
  },
  manipulacion: {
    colorAura: '#00CFFF',        // Cyan eléctrico
    patternDestello: 'espiral',  // Destello en espiral
    velocidadPulso: 1200,        // Pulso más lento, calculado
  },
  emision: {
    colorAura: '#FF6600',        // Naranja neón
    patternDestello: 'onda',     // Onda expansiva radial
    velocidadPulso: 600,         // Pulso muy rápido, explosivo
  },
  materializacion: {
    colorAura: '#FFD700',        // Dorado
    patternDestello: 'cristal',  // Destello que se expande en 6 puntos (como cristal)
    velocidadPulso: 1500,        // Pulso lento, sólido
  },
  transformacion: {
    colorAura: '#CC44FF',        // Violeta encendido
    patternDestello: 'cruz',     // Cruz pero con color violeta
    velocidadPulso: 1000,
  },
  especializacion: {
    colorAura: '#FFFFFF',        // Blanco puro
    patternDestello: 'flash',    // Flash instantáneo a pantalla completa tenue
    velocidadPulso: 2000,        // Pulso muy lento, místico
  },
}
```

**Paso 3 — Aplicar la firma**
Cuando un nodo tiene Check activo (`estado: 'fresh'`), su aura usa `colorAura` de `NEN_FIRMAS[getNenDominante()]` en vez del color fijo de su macro-área. El tamaño exterior del orbe no cambia — solo el color y velocidad del pulso del aura interna.

**Paso 4 — Transición suave**
Si el tipo dominante cambia entre sesiones (porque el radar evolucionó), la transición de color del aura debe ser gradual (interpolación de color en 3 segundos la próxima vez que se renderiza el mapa) — no un cambio abrupto.

**Paso 5 — Indicador en el hexágono**
En el centro del hexágono del Nen, muestra el nombre del tipo dominante actual en texto pequeño debajo del polígono del radar. Ejemplo: "HATSU: INTENSIFICACIÓN". Se actualiza cada vez que se recalcula el perfil suavizado.

---

## BLOQUE 3 — Onboarding (Pantalla de Bienvenida para Primera Vez)

### Objetivo
Un usuario que abre la app por primera vez ve un lienzo negro con nodos flotantes sin contexto. Este bloque añade un onboarding mínimo de 4 pantallas que explica el sistema antes de soltar al usuario en el mapa.

### Cuándo se muestra
Solo si `onboardingCompleted` no existe o es `false` en el almacenamiento local. Una vez completado, nunca más. Añade una opción en configuración para "Volver a ver el tutorial" si el usuario quiere revisarlo.

### Las 4 pantallas (carrusel deslizable, fondo oscuro, estética del juego)

**Pantalla 1 — Bienvenida:**
- Título: "Path of Self"
- Subtítulo: "Tu árbol de habilidades personal"
- Texto breve: "Este es tu mapa de desarrollo humano. Cada orbe representa una habilidad real que puedes practicar, dominar y evolucionar."
- Visual: el hexágono del Nen animado en el centro, pulsando suavemente

**Pantalla 2 — Los Orbes:**
- Título: "Los 4 botones de cada orbe"
- Muestra un orbe de ejemplo grande en el centro con los 4 botones del menú radial visibles
- Descripción de cada botón en texto pequeño al lado:
  - ✓ Check: "Marca tu práctica de hoy. Se reinicia cada día."
  - XP: "Sube de nivel tu habilidad de forma permanente."
  - i: "Ve los detalles, tutoriales y tu historial."
  - ×: "Envía la habilidad al Inframundo (recuperable)."

**Pantalla 3 — El Nen:**
- Título: "Tu energía Nen"
- Texto: "El hexágono central mide tu balance real entre las 6 áreas de tu vida. Cada check y cada XP mueve el polígono. Descubre tu tipo dominante."
- Visual: el radar chart con un polígono de ejemplo visible (no datos reales del usuario todavía — usa valores de ejemplo hardcodeados solo para esta pantalla)

**Pantalla 4 — Comienza:**
- Título: "El mapa te espera"
- Texto: "Toca cualquier orbe para empezar. Tu primer Check de hoy es suficiente."
- Botón grande: "Entrar al mapa" → cierra el onboarding, marca `onboardingCompleted: true`, va al lienzo principal con el botón de Foco del Día activado automáticamente para centrar la vista en los primeros nodos disponibles

### Diseño
- Fondo negro consistente con el lienzo
- Tipografía igual a la del mapa principal
- Indicador de progreso de pantallas (4 puntos en la parte inferior)
- El usuario puede saltar el onboarding con un botón "Saltar" pequeño en la esquina superior derecha desde la primera pantalla — pero si lo salta, `onboardingCompleted` igual se marca como `true`
- No uses librerías de onboarding externas — implementa el carrusel con `FlatList` horizontal o `ScrollView` con paginación, que ya están disponibles en React Native

---

## Orden de ejecución

1. **Bloque 1 (Supabase)** primero — es el más crítico porque protege el progreso ya acumulado. Verifica que la sincronización funciona en ambas direcciones (local → nube y nube → local) antes de continuar.
2. **Bloque 2 (Hatsu visual)** segundo — es el más estético y no tiene dependencias de los otros bloques.
3. **Bloque 3 (Onboarding)** último — es completamente independiente, no toca ninguna lógica existente.

Al terminar los 3 bloques, la V1 de Path of Self está completa.