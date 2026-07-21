@AGENTS.md

# Project: Mi App — personal iOS PWA

## What this is

A personal web app for a single user (the owner), meant to be installed on
iOS via Safari's "Add to Home Screen" so it opens standalone (no browser
chrome), like a native app. No multi-tenant concerns, no signup flow, no
OAuth — just the owner logging in with a fixed username/password.

Planned scope (in order): starter template first (done) → notes (done) →
generic personal tracker (habits/expenses/workouts/etc., schema exists, UI
pending) → push notifications (plumbing done, real reminders pending). The
repo right now is a working template/skeleton, not a finished feature set.

## Architecture decisions (already made, don't re-litigate without reason)

- **Auth**: Auth.js v5 (NextAuth) with the **Credentials** provider — a
  single hardcoded username/password pair from env vars (`APP_USERNAME`,
  `APP_PASSWORD`), checked in `src/auth.ts` with `timingSafeEqual`. No
  OAuth, no registration, no user table. Explicitly chosen over Google/Apple
  OAuth and over Clerk because the owner wanted the simplest possible login
  for a single-user app. Session strategy is **JWT** (not database — there's
  no adapter/User model to back a database session) with `maxAge` set to
  ~10 years so it effectively never expires; the owner asked for "que se
  mantenga la sesión para siempre".
- **No User model**: because there's exactly one user and no OAuth account
  linking is needed, `Note`, `TrackerEntry`, and `PushSubscription` have no
  `userId` column at all — this used to be a multi-user schema with Auth.js
  models (`User`/`Account`/`Session`/`VerificationToken`) from an earlier
  Google-OAuth iteration; all of that was removed when auth switched to
  Credentials. Don't re-add a `userId` FK unless this genuinely becomes
  multi-user.
- **ORM**: Prisma 7, chosen by the owner over Drizzle.
- **Database**: Vercel Postgres (which is Neon under the hood). Prisma 7
  requires a driver adapter — this project uses `@prisma/adapter-pg` + `pg`
  (Node.js runtime, not edge/serverless adapter), instantiated in
  `src/lib/prisma.ts`.
- **PWA**: full installable PWA ("Instalable completa"), not just responsive
  web. `public/manifest.json`, `public/icons/*`, `appleWebApp` metadata in
  `src/app/layout.tsx`.
- **Push**: native Web Push with VAPID (`web-push` package), not a third
  party push service. Service worker at `public/sw.js`.
- **Git branches**: `main` = production (Vercel Production environment),
  `develop` = staging (Vercel Preview environment). The original scaffolding
  branch (`claude/vercel-mcp-connection-b515uw`) was merged into `main` and
  is deleted locally; may still exist on GitHub remote (couldn't delete it
  remotely from the cloud session — 403 on `push --delete`, likely a token
  permission scope issue, not a `git` problem).

## Current status

Done:
- Next.js 16 (App Router) + TypeScript + Tailwind v4 scaffold
- Prisma schema (`prisma/schema.prisma`): `Note`, `TrackerEntry`,
  `PushSubscription` — no user table, see architecture notes above
- Auth wired: `src/auth.ts` (Credentials + long-lived JWT), route handler at
  `src/app/api/auth/[...nextauth]/route.ts`, `src/proxy.ts` protects all
  routes except `/login` and auth/static assets, `src/app/login/page.tsx`
  has the username/password form
- Notes CRUD (first feature) on the home page (`src/app/page.tsx`,
  `src/app/actions.ts`, `src/components/notes-list.tsx`)
- PWA manifest + icons (placeholders — regenerate real ones when you have
  branding) + iOS meta tags in `src/app/layout.tsx`
- Push notification plumbing: `public/sw.js`, `/api/push/subscribe`,
  `/api/push/send` (sends a test push to every stored subscription — no
  per-user filtering needed anymore), client component
  `src/components/push-manager.tsx`
- `postinstall: prisma generate` in `package.json` — **required** because
  `src/generated/prisma` is gitignored (it's generated code); without this
  script a fresh clone (e.g. Vercel's build) fails looking for that module

Not done yet:
- Tracker UI (the `TrackerEntry` model exists in the schema but has no
  pages/actions yet — it's intentionally generic: `kind` + `value`/`data`
  JSON so new tracker types don't need schema migrations)
- Real Postgres database not provisioned/connected (local `.env` has a
  placeholder `DATABASE_URL`, no `prisma/migrations/` directory exists yet —
  the first `prisma migrate dev` will create it)
- Production VAPID keys: a dev pair was generated and is sitting in the
  local `.env` (gitignored, not committed) — fine for testing, but you may
  want to regenerate before going to real production
- `APP_USERNAME`/`APP_PASSWORD` in local `.env` are placeholder dev values
  (`admin`/`changeme`) — change them before deploying anywhere reachable
- No `vercel.json` — not needed for a standard Next.js app (Vercel
  auto-detects framework/build/output). Only add one if you need something
  auto-detect doesn't cover — e.g. **Vercel Cron** for scheduled push
  reminders, custom headers, or pinning function regions
- Vercel project/env var setup was never completed from the cloud session —
  see "Known blocker" below

## Known blocker: Vercel CLI/API unreachable from the cloud session

The cloud session's outbound network proxy hard-blocks `vercel.com` and
`api.vercel.com` (403 "policy denial" at the CONNECT level) — confirmed via
the proxy's own diagnostics, not a transient error. This is a deliberate
network policy on that environment, not something to route around. That's
why setup moved to a local session — locally there's no such proxy, so the
Vercel CLI (`vercel login`, `vercel env add`, etc.) should just work.

A Vercel access token was pasted into the cloud chat during troubleshooting
but never successfully used (network blocked before it could authenticate).
**Treat it as compromised — rotate/revoke it** at
https://vercel.com/account/tokens before relying on any token for this
project.

## Env vars needed (see `.env.example`)

- `DATABASE_URL` — from Vercel → Storage → Create Database → Postgres
- `AUTH_SECRET` — `npx auth secret` or `openssl rand -base64 33`
- `APP_USERNAME` / `APP_PASSWORD` — whatever you want to log in with. Plain
  values compared with `timingSafeEqual`, not hashed — acceptable here
  because they're never exposed client-side and this is a single-user app,
  but don't reuse a password you care about elsewhere.
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — `npx web-push
  generate-vapid-keys`

## Gotchas hit during setup (so they don't get re-debugged from scratch)

- **Next.js 16 renamed `middleware.ts` to `proxy.ts`** (same behavior, new
  file name/export). This repo already uses `src/proxy.ts`. Don't recreate
  a `middleware.ts` — Next 16 predates a lot of the assistant's training
  data, see `AGENTS.md`'s warning to check `node_modules/next/dist/docs/`
  before assuming APIs.
- **Prisma 7 requires a driver adapter**, connection URL lives in
  `prisma.config.ts`, not in `schema.prisma`'s `datasource` block. Client
  instantiation must pass `{ adapter }` — see `src/lib/prisma.ts`.
- **`src/app/page.tsx` needs `export const dynamic = "force-dynamic"`.**
  Once it stopped calling `auth()` directly (no more `userId` to read),
  Next.js lost its signal that the page is dynamic and tried to prerender
  it at build time — which fails the build if there's no reachable database
  yet (`Can't reach database server`). The page reads live data and sits
  behind login anyway, so forcing dynamic rendering is correct, not a
  workaround to remove later.
- **`src/generated/prisma` is gitignored** — always re-run `npx prisma
  generate` after cloning or changing `prisma/schema.prisma`. The
  `postinstall` script in `package.json` normally handles this after
  `npm install`.
