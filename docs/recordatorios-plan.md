# Plan: Recordatorios + Progreso (Etapa 1)

Documento de producto (no técnico) para la primera etapa nueva de la app,
decidida en conversación con el owner. Cubre lógica, pantallas y features.
Antes de esto la app tenía: Notas (listo) y la infraestructura de push
notifications (registrada pero sin uso real todavía).

Fuera de alcance de esta etapa (queda para después): gestión financiera
(gastos, ingresos, suscripciones) — ver "Roadmap general" al final.

> **Este documento describe el diseño ACTUALIZADO (2026-07-23), ya
> implementado el mismo día** (ver `CLAUDE.md`, sección "Recordatorios
> redesign — implemented 2026-07-23", para el detalle técnico de la
> migración y los archivos tocados). Reemplaza por completo la versión
> del 2026-07-22 (recurrencia con 6 tipos incluyendo `INTERVAL`/`YEARLY`,
> `SIMPLE`/`LOGGED` con racha+heatmap para ambos, formulario denso con
> todo siempre visible) — esa versión ya no existe en el código. Los
> mockups en `docs/mockups/recordatorios/` se conservan como referencia
> visual de cómo se llegó a este diseño, no como algo pendiente. Ver la
> sección "Rediseño 2026-07-23" más abajo para el resumen de qué cambió y
> por qué. **Pendiente:** probar el flujo real en un dispositivo — esta
> sesión no pudo hacer testing autenticado end-to-end (ver el gotcha de
> TCP bloqueado en `CLAUDE.md`).

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

- **Título** (obligatorio) — también es el mensaje de notificación por
  defecto (ver "Mensaje de la notificación" más abajo).
- **Descripción** (opcional, informativa — no es lo que se manda en el
  push).
- **Etiquetas**: una o más. Se crean al vuelo al escribir una nueva (no
  es una lista fija predefinida).
- **Tipo de seguimiento** (elegido por el usuario al crear la tarea) —
  **redefinido** respecto a la versión implementada:
  - **Simple**: solo notificación. No queda registrado en ningún
    lado — no aparece en la pestaña Progreso, no tiene racha ni
    heatmap. Es el equivalente a un aviso puntual sin más.
  - **Compuesto**: tiene historial y progreso (racha, heatmap, gráfico
    — ver "Progreso"). Se confirma de una de dos formas, elegida al
    crear la tarea:
    - **Deslizar para confirmar** (slider): sin campos, solo marca
      hecho/no hecho. Pensado para hábitos donde solo importa si se
      hizo (ej. "hacer ejercicio los martes y jueves").
    - **Formulario personalizado**: la tarea define sus propios
      campos con un **constructor libre** (nombre + tipo por campo).
      Tipos soportados: Texto, Número, Sí/No, Fecha, Hora, Opciones
      (lista fija), y **Múltiple (grupo repetible)** — un campo que
      agrupa varios sub-campos y se puede repetir N veces al
      confirmar (ej. campo "Comidas" con sub-campos "Nombre de
      comida" (Texto) + "Calorías" (Número), y un botón "Agregar otra
      comida" que suma tantas instancias como haga falta en un mismo
      registro).
- **Recurrencia** (una de estas — **se sacaron los tipos "cada X
  días/semanas" y "anual"** del alcance, para simplificar; solo
  quedan 4 opciones):
  - **Una vez**: tiene una **fecha** (obligatoria). Opcionalmente
    también una **hora puntual del evento** (switch "Tiene hora
    puntual" — si está apagado, el evento es "todo el día" y no hay
    campo de hora).
  - **Todos los días**: sin fecha, se repite para siempre.
  - **Días específicos de la semana**: sin fecha, se repite para
    siempre en los días elegidos.
  - **Mensual**: una o más **fechas por mes** (grilla 1-31,
    multi-selección) más una opción separada **"Último día del
    mes"** (no es lo mismo que elegir el número 31 — ver más abajo).
  - Las recurrentes (Todos los días / Días de semana / Mensual) se
    repiten **para siempre** hasta que el usuario las pausa o borra —
    no hay fecha de corte automática. Completar la instancia de HOY
    no rompe la serie: la próxima vuelve a aparecer sola.
  - **"Último día del mes" vs. elegir el número 31**: investigado qué
    hacen otras apps (ClickUp, Outlook sí tienen una opción explícita
    de "último día"; Google Calendar no, y por eso la gente termina
    con workarounds confusos). Se decidió tener **ambas** como
    opciones separadas: si elegís el número puntual 31 (o 29, 30) y
    ese mes no lo tiene (ej. febrero), esa ocurrencia se salta ese mes
    sin ajustar sola. Si lo que querés es "pase lo que pase, el
    último día" (alquiler, cierre de mes), usás el chip dedicado.

### Mensaje de la notificación

- Campo de texto libre, ubicado dentro de "Más opciones" (no es lo
  primero que se ve al crear, porque el default cubre la mayoría de
  los casos).
- **Default si se deja vacío: el título de la tarea, tal cual** (se
  descartó agregar sufijos automáticos tipo "— vence hoy" por pedido
  explícito del owner: "título nadamás").
- Es **un solo mensaje por tarea**, no por cada aviso individual —
  aunque haya varios avisos configurados, todos mandan el mismo texto.

### Notificación (aviso)

Una tarea puede tener **varios avisos**, cada uno independiente. La
**forma** del aviso depende de si la tarea tiene fecha o no:

- **Todos los días / Días de semana** (sin fecha): el aviso es
  "hora del día" — un campo `HH:mm`, igual que en la versión
  implementada hoy.
- **Una vez / Mensual** (con fecha): el aviso es **"N días antes, a
  las HH:mm"** — un stepper (0 a 90, tope decidido con el owner) más
  un campo de hora. `N=0` significa "el mismo día". Si el evento
  tiene hora puntual (caso "Una vez"), el primer aviso sugiere esa
  hora por default, pero se puede cambiar. En **Mensual**, este mismo
  set de avisos aplica por igual a **todas** las fechas del mes
  elegidas — no hay configuración por fecha individual (decisión
  explícita: "un aviso para todas las fechas", no uno por fecha).
- En ambos casos, cada aviso tiene su propio **switch de "pedir
  confirmación"**, igual que en la versión implementada:
  - **Con confirmación**: al tocar la notificación se abre una
    pantalla de confirmación — un slider (para tareas Compuestas modo
    slider) o el formulario personalizado (modo formulario). La
    notificación se queda fija en pantalla hasta resolverse
    (`requireInteraction`).
  - **Sin confirmación**: puramente informativa, abre la app normal.
  - Nota: para tareas **Simples**, "pedir confirmación" no tiene
    sentido en el mismo grado — no hay historial que registrar, así
    que confirmar no guarda nada; queda a definir en la etapa técnica
    si igual se ofrece un botón de "descartar" o directamente no
    aplica el switch para este tipo.

### Progreso (sin XP, sin niveles — solo datos reales)

**Solo las tareas Compuestas aparecen acá** (cambio respecto a la
versión implementada, donde Simple y "con historial" compartían la
pestaña Progreso). Las tareas Simples no generan ningún dato para
mostrar.

- Racha actual, racha más larga, e historial visual de qué días se
  cumplió y cuáles no (heatmap de los últimos ~30 días).
- Modo formulario: gráfico/listado de los valores guardados en el
  tiempo — para campos "Múltiple (grupo)" esto implica varias
  entradas por día (ej. cada comida registrada), no un solo valor.
- Tareas puntuales ("Una vez") pasadas: historial aparte, separado de
  las activas, mostrando si se cumplieron o no.
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

### Crear / editar tarea — **rediseñada, ver mockups**

Rediseño completo pensado para bajar la cantidad de controles siempre
visibles (la versión implementada tiene ~8 secciones abiertas al
mismo tiempo). Mockups interactivos en `docs/mockups/recordatorios/`
(4 partes, iteradas con el owner):

1. **`v1-pantalla-simplificada.html`** — estructura general: título
   grande arriba, chips para "Repetición" (en vez de un `<Select>`
   dropdown), un aviso por defecto con link "agregar otro" en vez de
   una lista siempre abierta, y todo lo secundario (descripción,
   etiquetas, tipo de seguimiento) tapado atrás de un disclosure
   "Más opciones" cerrado por default.
2. **`v2-fecha-y-avisos.html`** — el detalle de "Una vez" (fecha +
   switch de hora puntual opcional) y "Mensual" (grilla táctil 1-31 +
   chip "Último día del mes"), y la forma de los avisos "N días
   antes, a las HH:mm" con stepper.
3. **`v3-pantalla-completa.html`** — todo combinado en una sola
   pantalla: los 4 chips de recurrencia (sin "Cada X días/semanas" ni
   "Anual", sacados del alcance), y la sección de Avisos que cambia
   de forma sola según el tipo elegido (hora del día vs. días antes).
   Incluye también el campo "Mensaje de la notificación" (dentro de
   Más Opciones, con preview en vivo de qué se va a mandar).
4. **`v4-simple-vs-compuesto.html`** — la pantalla de "Tipo de
   seguimiento" (Simple / Compuesto), el sub-selector de Compuesto
   (slider / formulario), el **constructor de campos libre** (nombre
   + tipo, incluyendo "Múltiple (grupo)" con sus propios sub-campos
   anidados), y las dos pantallas de confirmación resultantes: el
   slider deslizable y el formulario con el grupo repetible en acción
   ("Agregar otra comida").

Resumen de los controles que quedan, por tipo de recurrencia elegido:

| Repetición | ¿Fecha? | Forma del aviso |
|---|---|---|
| Una vez | Sí (+ hora opcional) | N días antes, a las HH:mm |
| Todos los días | No | Hora del día (HH:mm) |
| Días de semana | No | Hora del día (HH:mm) |
| Mensual | Sí, una o más por mes | N días antes, a las HH:mm (aplica a todas las fechas) |

### Pantallas de confirmación (al tocar una notificación con confirmación activada) — **rediseñadas**

Ahora dependen del tipo de seguimiento de la tarea:

- **Simple**: no hay pantalla de confirmación con estado que guardar
  (no hay historial). Queda a definir en la etapa técnica si igual
  abre algo mínimo o directamente no aplica.
- **Compuesto, modo slider**: título de la tarea + un control de
  "deslizar para confirmar" (no un botón). Al llegar al final se pone
  en verde y confirma — pensado para evitar confirmaciones
  accidentales por un toque.
- **Compuesto, modo formulario**: título de la tarea + los campos que
  se definieron al crearla, renderizados dinámicamente según su tipo.
  Los campos "Múltiple (grupo)" se muestran como tarjetas repetibles
  (una por instancia) con botón "Agregar otro/a [nombre del grupo]" y
  opción de eliminar cada instancia individual.

### Progreso

- Card por tarea Compuesta: racha actual/más larga + heatmap de
  cumplimiento. **Las tareas Simples no aparecen en esta pestaña.**
- Gráfico o listado del valor guardado en el tiempo (modo formulario).
- Estadísticas generales, filtrable por etiqueta.

## Lógica (cómo funciona por dentro, en términos de comportamiento)

- **Instancias de tareas recurrentes**: cada día "se materializa" una
  ocurrencia según el patrón de recurrencia de la tarea; completar la
  de hoy no afecta a las futuras.
- **Cálculo de racha**: días consecutivos con la ocurrencia programada
  cumplida; se corta apenas un día programado no se marcó a tiempo.
- **Disparo de notificaciones**: ya resuelto en la versión implementada
  — un GitHub Actions workflow pega cada 15 minutos a
  `/api/cron/reminders`, que revisa qué avisos tocan enviarse ahora
  (ver `CLAUDE.md`, sección Recordatorios). El rediseño no cambia este
  mecanismo, solo qué datos evalúa (ahora el offset "días antes" para
  tareas con fecha, además de la hora del día que ya manejaba).
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

## Rediseño 2026-07-23 — resumen de qué cambia y por qué

Conversación de diseño completa, parte por parte, con mockups
interactivos revisados y ajustados en cada paso (ver
`docs/mockups/recordatorios/`). Motivación general del owner: la
pantalla de creación implementada el 2026-07-22 tiene demasiados
controles siempre visibles, y el modelo de "tipo de seguimiento" no
distinguía bien entre "avisame nomás" y "quiero ver progreso" —
además de faltar una forma de definir qué datos se registran para
tareas más específicas (ej. contador de calorías).

Decisiones tomadas, en orden:

1. **UI de creación simplificada**: chips en vez de dropdown para
   Repetición, un aviso por defecto en vez de lista abierta, todo lo
   secundario tapado en "Más opciones".
2. **Recurrencia recortada a 4 tipos** (se sacaron "Cada X
   días/semanas" y "Anual" del alcance — no solo escondidos,
   eliminados como opción).
3. **Mensual con múltiples fechas + "Último día del mes"** como chip
   separado de elegir el número 31 (investigado qué hacen otras apps
   — ver sección de Recurrencia arriba).
4. **Fecha vs. aviso como conceptos distintos**: Una vez/Mensual
   tienen fecha (el "qué día es"); el aviso es una anticipación
   configurable ("N días antes, a las HH:mm") sobre esa fecha, no la
   fecha en sí. Todos los días/Días de semana no tienen fecha, así
   que su aviso es directamente una hora del día, como ya era.
5. **Mensaje de notificación personalizable**: campo de texto libre
   (no frases predefinidas), un mensaje por tarea (no por aviso),
   default = título tal cual si se deja vacío, ubicado en "Más
   opciones".
6. **Tipo de seguimiento redefinido**: Simple = solo notificación, sin
   ningún registro ni aparición en Progreso (antes sí tenía racha).
   Compuesto = tiene historial y progreso, y se confirma con slider
   (deslizar, reemplaza el botón "Confirmar" plano) o con un
   **formulario de campos personalizados** que arma el usuario al
   crear la tarea (constructor libre: nombre + tipo por campo,
   tipos: Texto/Número/Sí-No/Fecha/Hora/Opciones/Múltiple-grupo). El
   tipo "Múltiple (grupo)" permite repetir un conjunto de sub-campos
   tantas veces como haga falta en un mismo registro (ej. varias
   comidas con nombre+calorías cada una, en la misma confirmación).

Este documento (secciones de arriba) ya está actualizado con el
resultado final de todas estas decisiones, y esas decisiones **ya están
implementadas** en el código (mismo día, vía `/goal`) — ver `CLAUDE.md`
para el detalle técnico (migración, archivos nuevos/reescritos).

## Fuera de alcance de esta etapa (asunciones a confirmar más adelante)

Cosas que surgieron en la investigación pero no se definieron todavía
porque no bloquean el diseño de esta etapa:

- ¿Se puede posponer/snooze un recordatorio desde la pantalla de
  confirmación, o solo confirmar? (no se discutió explícitamente)
- ¿Qué pasa visualmente con la racha si un día no se completa: se
  resetea a 0 o se muestra el corte de otra forma?
- ¿Las etiquetas son compartidas entre Notas y Recordatorios, o cada
  sección tiene las suyas?
- Tareas **Simples** y el switch de "pedir confirmación" por aviso:
  resuelto en la implementación — el switch sigue existiendo en el
  schema, pero el sweep de cron solo abre la pantalla de confirmación
  cuando la tarea es Compuesta; en una Simple el push abre la app
  normal sin importar el switch, porque no hay nada que persistir.
- Modelo de datos para el constructor de campos libre y el tipo
  "Múltiple (grupo)": **resuelto e implementado** — `Task.formSchema`
  (JSON, `FormFieldDef[]` en `src/lib/form-schema.ts`, un solo nivel de
  anidamiento) + `TaskCompletion.data` (JSON, valores por id de campo;
  un campo `GROUP` guarda un array de objetos, uno por repetición). Ver
  `CLAUDE.md` para el detalle completo.
- Cómo migran los datos/tareas ya creadas con el modelo viejo
  (`INTERVAL`/`YEARLY`, `LOGGED` con value+note fijo) al modelo nuevo:
  resuelto — se migraron las filas `LOGGED` existentes a `COMPOUND` con
  `confirmMode = SLIDER` (no había concepto de formulario antes, así que
  no hay nada que mapear a `formSchema`); filas con recurrencia
  `INTERVAL`/`YEARLY` quedan con datos obsoletos en la columna JSON,
  pero `isTaskDueOn` las trata como "nunca vence" en vez de romper.

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
