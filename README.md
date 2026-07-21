# Mi App

PWA personal (Next.js + Prisma + Vercel Postgres) instalable en iOS Safari, con login de Google, notas y notificaciones push. Pensada para un solo usuario (vos).

## Stack

- Next.js 16 (App Router), React 19, TypeScript, Tailwind v4
- Auth.js v5 (Google OAuth, sesiones en base de datos)
- Prisma 7 + `@prisma/adapter-pg` sobre Vercel Postgres (Neon)
- Web Push (VAPID) con service worker propio
- PWA instalable en iOS (manifest + `apple-touch-icon` + `display: standalone`)

## Modelos (`prisma/schema.prisma`)

- `User`, `Account`, `Session`, `VerificationToken` — requeridos por Auth.js
- `Note` — feature inicial (título, contenido, pin)
- `TrackerEntry` — tracker genérico (`kind` + `value`/`data` JSON) para agregar hábitos, gastos, entrenamientos, etc. sin tocar el schema
- `PushSubscription` — suscripciones de push por dispositivo

## Setup local

1. Copiá `.env.example` a `.env` y completá:
   - `DATABASE_URL`: connection string de Postgres (local o ya de Vercel)
   - `AUTH_SECRET`: `npx auth secret` (o `openssl rand -base64 33`)
   - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`: ver abajo
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`: `npx web-push generate-vapid-keys`

2. Instalar dependencias y generar el cliente Prisma:

   ```bash
   npm install
   npx prisma generate
   ```

3. Correr la migración inicial contra tu base:

   ```bash
   npx prisma migrate dev --name init
   ```

4. Levantar el server:

   ```bash
   npm run dev
   ```

## Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → **Create Credentials → OAuth client ID → Web application**.
2. **Authorized redirect URI**:
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Prod: `https://TU-DOMINIO/api/auth/callback/google`
3. Copiá Client ID / Secret a `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.

Solo vos vas a poder entrar igual (no hay flujo de registro/roles), pero si querés restringir por email además del login, se puede agregar un chequeo en el callback `signIn` de `src/auth.ts`.

## Deploy en Vercel

1. Importá el repo en Vercel (dashboard → Add New → Project).
2. **Storage → Create Database → Postgres**, conectalo al proyecto. Vercel va a exponer `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, etc. Copiá la que uses como `DATABASE_URL` en las env vars del proyecto (Settings → Environment Variables), o renombrala directamente a `DATABASE_URL`.
3. Cargá el resto de las env vars (`AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`) en el proyecto de Vercel.
4. Actualizá el redirect URI de Google OAuth con el dominio real de producción.
5. Deploy. Corré la migración contra la DB de producción una vez (`npx prisma migrate deploy`, con `DATABASE_URL` de prod en el entorno) o desde tu máquina apuntando a esa connection string.

## Instalar como PWA en iOS

1. Abrí el sitio en Safari (no Chrome — en iOS el "Add to Home Screen" real es de Safari).
2. Compartir → **Agregar a pantalla de inicio**.
3. Se abre en modo `standalone` (sin barra de Safari) usando `public/manifest.json` y los íconos de `public/icons/`.

Los íconos generados (`public/icons/*.png`) son placeholders — reemplazalos por los tuyos cuando quieras.

## Notificaciones push

- El botón "Activar notificaciones" en la home pide permiso, registra `public/sw.js` y guarda la suscripción en `PushSubscription`.
- `POST /api/push/send` manda una notificación de prueba a todas las suscripciones del usuario logueado (usalo para probar el flujo end to end).
- Para push reales desde otras partes de la app, reusá `webpush.sendNotification(...)` de `src/lib/push.ts` con las suscripciones del usuario.
