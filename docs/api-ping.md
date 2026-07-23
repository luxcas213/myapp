# `/api/ping` — endpoint público de notificaciones

Endpoint HTTP público (sin autenticación) que le manda una push
notification al dueño de la app. Pensado para que terceros (amigos)
puedan avisarle algo sin necesitar cuenta ni login.

- Código: `src/app/api/ping/route.ts`
- Excluido del gate de sesión en `src/proxy.ts` (matcher ignora `api/ping`)
- URL base: `https://myapp-one-pearl.vercel.app/api/ping`

## Métodos

Soporta `GET` (query params) y `POST` (JSON body). Misma lógica en
ambos casos.

### GET

```
GET /api/ping?message=<texto>&from=<nombre>
```

Ejemplo:

```
https://myapp-one-pearl.vercel.app/api/ping?message=Hola%20Lucas&from=Juan
```

### POST

```
POST /api/ping
Content-Type: application/json

{
  "message": "Hola Lucas!",
  "from": "Juan"
}
```

Ejemplo con curl:

```bash
curl -X POST https://myapp-one-pearl.vercel.app/api/ping \
  -H "Content-Type: application/json" \
  -d '{"message":"Hola!","from":"Juan"}'
```

## Parámetros

| Campo     | Requerido | Máximo    | Default (si falta)  |
|-----------|-----------|-----------|----------------------|
| `message` | Sí        | 500 chars | — (400 si falta)     |
| `from`    | No        | 60 chars  | `"Alguien"`           |

Ambos se recortan (`trim`) y truncan al máximo antes de usarse.

## Respuestas

| Status | Body                          | Cuándo                                   |
|--------|-------------------------------|-------------------------------------------|
| 200    | `{ "ok": true, "sent": N }`    | Éxito. `sent` = cantidad de subscriptions a las que efectivamente se les envió el push (puede ser 0 si no hay ninguna registrada o todas fallaron). |
| 400    | `{ "error": "Falta el mensaje (message)." }` | `message` vacío o ausente. |
| 429    | `{ "error": "Demasiados pings, probá de nuevo en un rato." }` | Rate limit superado (ver abajo). |

## Rate limit

Máximo **5 pings por minuto en total** (no por IP ni por remitente —
es un contador global). Se implementa contando filas `TrackerEntry`
con `kind: "ping"` creadas en los últimos 60 segundos
(`prisma.trackerEntry.count`). Si se supera, devuelve 429 y no envía
push ni registra el intento.

## Qué hace internamente

1. Valida y sanitiza `message`/`from`.
2. Chequea el rate limit contra `TrackerEntry` (kind `"ping"`).
3. Si pasa, inserta un nuevo `TrackerEntry` (`kind: "ping"`, `note:
   message`, `data: { from }`) — sirve como log/auditoría además de
   contador de rate limit.
4. Busca todas las filas de `PushSubscription` (no hay filtro por
   usuario — asume single-owner, mismo patrón que `/api/push/send`).
5. Envía a cada una un push con `webpush.sendNotification`, payload:
   ```json
   { "title": "📩 <from> te mandó un mensaje", "body": "<message>", "url": "/" }
   ```
6. Cuenta cuántos envíos tuvieron éxito (`Promise.allSettled`) y lo
   devuelve en `sent`.

## Notas / limitaciones conocidas

- Sin autenticación por diseño — cualquiera con la URL puede usarlo.
  El único freno a abuso es el rate limit de 5/min.
- El rate limit es global, no por remitente ni IP — si cinco personas
  distintas escriben en el mismo minuto, la sexta (sea quien sea)
  recibe 429.
- No hay endpoint para leer el historial de pings vía API — quedan
  solo como filas `TrackerEntry` en la base.
- Reusa la misma tabla `PushSubscription` que el resto de la app
  (sin `userId`, ver `CLAUDE.md` — "no hace falta" mientras sea
  single-owner).
