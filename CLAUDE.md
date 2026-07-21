@AGENTS.md

# Project: Mi App — personal iOS PWA

## What this is

A personal web app for a single user (the owner), meant to be installed on
iOS via Safari's "Add to Home Screen" so it opens standalone (no browser
chrome), like a native app. No multi-tenant concerns, no signup flow — only
the owner logs in.

Planned scope (in order): starter template first (done) → notes → generic
personal tracker (habits/expenses/workouts/etc.) → push notifications
(reminders). The owner described it as "todo, tipo tracker personal, notas,
y también push notifications, pero empecemos con un template" — so the repo
right now is a working template/skeleton, not a finished feature set.

## Architecture decisions (already made, don't re-litigate without reason)

- **Auth**: Auth.js v5 (NextAuth) with **Google** provider only. Explicitly
  chosen over Sign in with Apple (requires paid Apple Developer account +
  much more setup) and over Clerk (extra third-party vendor not needed for a
  single-user app). Sessions use the **database** strategy (not JWT) via the
  Prisma adapter.
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
- Prisma schema (`prisma/schema.prisma`): Auth.js models (`User`, `Account`,
  `Session`, `VerificationToken`) + app models (`Note`, `TrackerEntry`,
  `PushSubscription`)
- Auth.js wired: `src/auth.ts`, route handler at
  `src/app/api/auth/[...nextauth]/route.ts`, `src/proxy.ts` protects all
  routes except `/login` and auth/static assets
- Notes CRUD (first feature) on the home page (`src/app/page.tsx`,
  `src/app/actions.ts`, `src/components/notes-list.tsx`)
- PWA manifest + icons (placeholders — regenerate real ones when you have
  branding) + iOS meta tags in `src/app/layout.tsx`
- Push notification plumbing: `public/sw.js`, `/api/push/subscribe`,
  `/api/push/send` (sends a test push to the logged-in user), client
  component `src/components/push-manager.tsx`
- `postinstall: prisma generate` in `package.json` — **required** because
  `src/generated/prisma` is gitignored (it's generated code); without this
  script a fresh clone (e.g. Vercel's build) fails looking for that module

Not done yet:
- Tracker UI (the `TrackerEntry` model exists in the schema but has no
  pages/actions yet — it's intentionally generic: `kind` + `value`/`data`
  JSON so new tracker types don't need schema migrations)
- Real Postgres database not provisioned/connected (local `.env` has a
  placeholder `DATABASE_URL`)
- Real Google OAuth credentials not created (`AUTH_GOOGLE_ID` /
  `AUTH_GOOGLE_SECRET` are empty in local `.env`)
- Production VAPID keys: a dev pair was generated and is sitting in the
  local `.env` (gitignored, not committed) — fine for testing, but you may
  want to regenerate before going to real production
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
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — Google Cloud Console → OAuth
  Client ID (Web application). Redirect URI:
  `https://<domain>/api/auth/callback/google` — needs one entry **per
  domain** you use (production `main` domain, preview `develop` domain,
  `localhost:3000` for local dev), otherwise login breaks on whichever
  domain isn't registered.
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
- **Auth.js database sessions don't include `user.id` on `session.user` by
  default** — added via the `session` callback in `src/auth.ts` plus a type
  augmentation in `src/types/next-auth.d.ts`.
- **`src/generated/prisma` is gitignored** — always re-run `npx prisma
  generate` after cloning or changing `prisma/schema.prisma`. The
  `postinstall` script in `package.json` normally handles this after
  `npm install`.
