# Plan: Recordatorios + Progreso (Etapa 1)

Documento de producto (no técnico) para la primera etapa nueva de la app,
decidida en conversación con el owner. Cubre lógica, pantallas y features.
Antes de esto la app tenía: Notas (listo) y la infraestructura de push
notifications (registrada pero sin uso real todavía).

Fuera de alcance de esta etapa (queda para después): gestión financiera
(gastos, ingresos, suscripciones) — ver "Roadmap general" al final.

## Por qué esto y no otra cosa

El owner priorizó, en orden:
1. Recordatorios de la vida real (vencimientos, trámites) y control de
   gastos como las dos áreas más "dispersas" hoy.
2. Al pensarlo mejor, decidió arrancar por recordatorios/to-do antes que
   por gastos.
3. Quiere que la app le avise (no la abre por rutina) y que cargar algo
   sea rápido cuando la abre durante el día.
4. Quiere ver progreso/tendencias, no solo un registro plano — pero
   **explícitamente sin gamificación de puntos/XP/niveles** (se
   consideró el modelo tipo Habitica/Finch y se descartó: "solo
   recordatorios y progreso").

## Modelo conceptual

### Tarea (la unidad base)

- **Título** (obligatorio)
- **Descripción** (opcional)
- **Fecha límite** (opcional — solo aplica a tareas puntuales)
- **Etiquetas**: una o más. Se crean al vuelo al escribir una nueva (no
  es una lista fija predefinida).
- **Tipo de seguimiento** (elegido por el usuario al crear la tarea):
  - **Simple**: se marca hecho / no hecho, sin guardar nada más.
  - **Con historial**: cada vez que se confirma, queda guardado un
    registro con fecha/hora, y opcionalmente una nota corta y/o un
    valor numérico (ej: "tomé la pastilla", "2 vasos de agua").
- **Recurrencia** (una de estas):
  - Puntual: ocurre una sola vez, en la fecha límite.
  - Todos los días.
  - Días específicos de la semana (ej: lun/mié/vie, o "días de
    semana", o "solo finde").
  - Cada X días o cada X semanas (intervalo personalizado).
  - Mensual o anual (ej: "el día 5 de cada mes", cumpleaños/trámites
    anuales).
  - Las recurrentes se repiten **para siempre** hasta que el usuario
    las pausa o borra — no hay fecha de corte automática.
  - Completar la instancia de HOY no rompe la serie: mañana vuelve a
    aparecer sola.

### Notificación (aviso)

Una tarea puede tener **varios avisos**, cada uno independiente:

- Hora específica (para recurrentes: hora del día; para puntuales:
  fecha/hora exacta, típicamente algo antes de la fecha límite).
- **Switch propio, independiente del tipo de tarea**: "pedir
  confirmación al tocarla" sí/no.
  - **Con confirmación**: al tocar la notificación, se abre una
    pantalla con un botón grande para confirmar (+ campo de nota/valor
    si la tarea es "con historial"). La notificación se queda fija en
    pantalla hasta que el usuario la resuelve (no desaparece sola ni
    se pierde en el centro de notificaciones — `requireInteraction`).
  - **Sin confirmación**: es puramente informativa (ej: "hoy es el
    cumpleaños de X"). Al tocarla se abre la app normal, sin pantalla
    ni acción especial requerida.

### Progreso (sin XP, sin niveles — solo datos reales)

- Por tarea recurrente: racha actual, racha más larga, e historial
  visual de qué días se cumplió y cuáles no (estilo calendario de
  cuadraditos, "heatmap" de los últimos ~30 días).
- Por tareas "con historial": gráfico simple del valor guardado en el
  tiempo (ej: vasos de agua por día en la semana).
- Tareas puntuales pasadas: historial aparte, separado de las
  activas, mostrando si se cumplieron o no.
- Vista general con estadísticas: % de cumplimiento del mes, filtrable
  por etiqueta.

## Pantallas

### Nav bar (global)

Tres secciones: **Home** / **Recordatorios** / **Notas**.

### Home

- Resumen del día: recordatorios de hoy, con un check rápido para
  marcarlos hechos ahí mismo (sin entrar al detalle de la tarea).
- Accesos rápidos: "+ Nuevo recordatorio", "+ Nueva nota" — pensado
  para carga rápida durante el día, que es como el owner dijo que va
  a usar la app.

### Recordatorios (lista principal)

- Lista de tareas activas agrupadas (Hoy / Próximas / Sin fecha).
- Cada ítem: título, etiqueta(s), indicador de racha si es recurrente,
  botón rápido de completar.
- Filtro por etiqueta (chips).
- Sub-vistas dentro de la misma sección (no tabs nuevos en la nav bar
  global): **Activos** / **Progreso** / **Historial** (puntuales
  pasadas).
- Botón para crear una tarea nueva.

### Crear / editar tarea

- Título, descripción.
- Etiquetas (autocompletar existentes + crear nueva).
- Tipo de seguimiento: Simple / Con historial (si con historial:
  elegir si acepta nota, valor numérico, o ambos — ambos opcionales
  al confirmar, no obligatorios).
- Recurrencia: selector con los sub-campos que correspondan según la
  opción elegida (fecha única / días de semana / intervalo / día del
  mes o fecha anual).
- Notificaciones: lista editable de avisos, cada uno con su hora y su
  switch de "pedir confirmación". Botón para agregar otro aviso.

### Pantalla de confirmación (al tocar una notificación con confirmación activada)

- Título y descripción de la tarea.
- Si es "con historial": campo opcional de nota + campo opcional de
  valor numérico.
- Botón grande de "Confirmar".

### Progreso

- Card por tarea recurrente: racha actual/más larga + heatmap de
  cumplimiento.
- Gráfico del valor guardado en el tiempo (tareas "con historial").
- Estadísticas generales, filtrable por etiqueta.

## Lógica (cómo funciona por dentro, en términos de comportamiento)

- **Instancias de tareas recurrentes**: cada día "se materializa" una
  ocurrencia según el patrón de recurrencia de la tarea; completar la
  de hoy no afecta a las futuras.
- **Cálculo de racha**: días consecutivos con la ocurrencia programada
  cumplida; se corta apenas un día programado no se marcó a tiempo.
- **Disparo de notificaciones**: requiere un proceso del lado del
  servidor que revise periódicamente qué avisos tocan enviarse ahora
  (no puede depender de que el usuario tenga la app abierta). Pendiente
  de arquitectura — ver nota en CLAUDE.md sobre `Vercel Cron`.
- **Zona horaria**: se asume la hora local del dispositivo (app de uso
  personal, sin necesidad de manejar múltiples zonas horarias).
- **Notificaciones en iOS — límites técnicos confirmados**:
  - No hay botones ni sliders dentro de la notificación misma (Safari
    no soporta `actions` de la Notification API, eso es solo Chrome).
    Por eso el flujo es: tocar → abrir pantalla de confirmación.
  - `requireInteraction: true` sí está soportado y se usa en los
    avisos marcados "con confirmación".
  - Badge numérico en el ícono de la app (Badging API): investigado,
    **descartado a pedido del owner**.
  - Face ID/Touch ID para login (WebAuthn/passkeys): investigado,
    **descartado** — la sesión ya dura ~10 años, no hace falta.
  - PWAs en la Unión Europea (iOS 17.4+) pierden soporte de push por
    una restricción de Apple (DMA) — no aplica fuera de la UE.

## Fuera de alcance de esta etapa (asunciones a confirmar más adelante)

Cosas que surgieron en la investigación pero no se definieron todavía
porque no bloquean el diseño de esta etapa:

- ¿Se puede posponer/snooze un recordatorio desde la pantalla de
  confirmación, o solo confirmar? (no se discutió explícitamente)
- ¿Qué pasa visualmente con la racha si un día no se completa: se
  resetea a 0 o se muestra el corte de otra forma?
- ¿Las etiquetas son compartidas entre Notas y Recordatorios, o cada
  sección tiene las suyas?

## Roadmap general (para ubicar esta etapa en el panorama completo)

1. **Recordatorios + Progreso** (este documento) — en diseño.
2. Gestión financiera: gastos, ingresos, suscripciones, con vistas de
   gasto por categoría, comparación mes a mes y listado de
   suscripciones activas (que además funcionan como recordatorio de
   pago recurrente, uniendo ambas features).
3. Rediseño completo de Home una vez existan ambas secciones, para
   mostrar de un vistazo: próximos recordatorios + resumen de gasto
   del mes + accesos rápidos.
4. Más adelante, sin fecha definida: hábitos/salud si el owner lo pide
   — la base técnica (modelo `TrackerEntry` genérico) ya está pensada
   para eso, no bloquea nada de lo anterior.
