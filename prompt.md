Contexto del Proyecto: Sistema de árbol de desarrollo radial basado en Path of Exile 2.
Objetivo: Rediseñar la geometría, layout y conexiones para pasar de una expansión continua a un sistema estricto de órbitas discretas, conexiones en arco y clusters geométricos (Fase A y Fase B).

Por favor, modifica los archivos correspondientes siguiendo estas instrucciones técnicas estructuradas:

---

### FASE 1: ÓRBITAS DISCRETAS (Snap a Radios Fijos)
Modifica el archivo de cálculo de layout (ej. `polarLayout.ts` o donde se calculen las coordenadas X, Y de los nodos):
1. Elimina el cálculo de radio continuo (ej: padre.radius + distancia fija).
2. Define una constante de Órbitas Concéntricas Estrictas (Radios fijos desde el centro 0,0):
   - Órbita 1 (Macro-nodos Raíz): 180px
   - Órbita 2 (Nodos Principales): 340px
   - Órbita 3 (Nodos Secundarios / Conectores): 500px
   - Órbita 4 (Nodos Avanzados / Extremos): 660px
3. Regla de Posicionamiento: Cada nodo debe hacer "snap" (ajustarse de forma obligatoria) al radio exacto de la órbita que le corresponda según su nivel de profundidad en el árbol, manteniendo su ángulo dentro del cuadrante asignado (±40° de su sector).

---

### FASE 2: CONEXIONES CURVAS (Arcos SVG en Órbitas)
Modifica el componente de renderizado de conexiones (ej. `TreeConnections.tsx` o `TreeLink.tsx`):
1. Sustituye las líneas rectas `<line>` por elementos `<path>` de SVG para las conexiones entre nodos que comparten la misma órbita o nivel de profundidad.
2. Si dos nodos conectados están en la misma órbita (mismo radio), la línea DEBE ser un arco curvo que siga el radio de esa órbita. Usa el comando de arco de SVG:
   `M x1 y1 A radius radius 0 0 [sweep-flag] x2 y2`
3. Si la conexión es de una órbita interna a una externa (padre a hijo en diferente radio), mantén una línea recta radial limpia o un ligero suavizado bezier para que no cruce de forma caótica.

---

### FASE 3: CLUSTERS GEOMÉTRICOS (Patrones Fijos de Hermanos)
Modifica la distribución angular de los nodos hermanos en el layout:
1. En lugar de esparcir los nodos hijos en un abanico angular simple y uniforme, implementa patrones geométricos fijos basados en la cantidad de hijos que tenga un nodo:
   - 2 Hijos: Distribución en pareja simétrica en la misma órbita.
   - 3 Hijos: Formación en triángulo equilátero o "V" compacta usando la órbita actual y la siguiente.
   - 4 Hijos: Formación en rombo o cuadrado geométrico compacto (Cluster).
2. Añade un margen de "aire" o separación angular notable entre diferentes clusters para evitar el amontonamiento visual y dar la sensación de grupos independientes.

---

### FASE 4: HUB CENTRAL DECORATIVO
Modifica el fondo o lienzo del árbol (ej. `TreeSpaceBackground.tsx` o el contenedor principal del Canvas):
1. En el centro exacto del lienzo (coordenadas 0,0 matemáticas), renderiza un Hub Central puramente ornamental (sin interacciones de nodos jugables).
2. Este Hub debe constar de:
   - 2 o 3 círculos concéntricos SVG concéntricos con líneas tenues (opacity: 0.2) y un efecto de brillo difuminado (glow/filter drop-shadow).
   - Un diseño visual geométrico decorativo en el centro (simulando runas o un núcleo de constelación) que ancle visualmente el origen de los 4 sectores.

Refactoriza el código asegurando que no se rompan las referencias de IDs de los nodos ni el estado de activación (nodos desbloqueados mantienen su glow de ruta activa en los nuevos paths curvos).