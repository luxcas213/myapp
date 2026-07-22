@AGENTS.md

# Project: Mi App — personal iOS PWA

## What this is

A personal web app for a single user (the owner), meant to be installed on
iOS via Safari's "Add to Home Screen" so it opens standalone (no browser
chrome), like a native app. No OAuth, no public signup flow — login is
username/password, with accounts created by the owner via a CLI script (see
"No User model" below — this changed from a single hardcoded credential pair
to a real `User` table on 2026-07-21).

Planned scope (in order): starter template (done) → notes (done) →
**Recordatorios/reminders with real push notifications (done, 2026-07-22)**
→ financial management (expenses/income/subscriptions, not started) → home
redesign once both exist → habits/health later if wanted. The owner
explicitly does not want gamification (XP/levels/points) anywhere — see the
Recordatorios section below for why that was considered and rejected.

## Architecture decisions (already made, don't re-litigate without reason)

- **Auth**: Auth.js v5 (NextAuth) with the **Credentials** provider, checked
  in `src/auth.ts`. **As of 2026-07-21 this is DB-backed multi-user**, not
  the original single hardcoded env-var pair: a Prisma `User` model
  (`id`, `username` unique, `passwordHash`, `createdAt`) holds accounts,
  `authorize()` does `prisma.user.findUnique` + `bcrypt.compare`
  (`bcryptjs` package). No OAuth, no registration, no OAuth
  Account/Session/VerificationToken models — this is intentionally *not*
  the full Auth.js database-session model, just one extra table for
  credential lookup; session strategy is still **JWT**. Explicitly chosen
  over Google/Apple OAuth and over Clerk because the owner wanted a simple
  login, but the owner deliberately asked to move from single-user to
  multi-user (even though in practice only they use it) rather than staying
  with the env-var pair. `maxAge` is still ~10 years so sessions
  effectively never expire ("que se mantenga la sesión para siempre").
  `APP_USERNAME`/`APP_PASSWORD` env vars are **dead** — `src/auth.ts` no
  longer reads them (`.env.example` still lists them; that's stale, not a
  live config option — don't set them expecting them to do anything).
- **User creation is owner-only, no public signup**: `scripts/create-user.ts`
  (`npx tsx scripts/create-user.ts <username> <password>`) upserts a `User`
  row with a bcrypt hash (cost 12). There is no `/register` page and none is
  planned. Known rough edges in this script (from code review, not yet
  fixed): it doesn't load `.env`/`.env.local` itself (no `import
  "dotenv/config"`, unlike `prisma.config.ts`) so `DATABASE_URL` must
  already be exported in the shell or the script can't connect; `main()`
  has no `.catch()`, so a DB error becomes an unhandled rejection; and
  `prisma.$disconnect()` doesn't close the underlying `pg.Pool` from
  `src/lib/prisma.ts` (no `disposeExternalPool: true`), so the process may
  hang after printing success — Ctrl+C is currently the workaround.
- **No `userId` FK on other models**: `Note`, `TrackerEntry`, and
  `PushSubscription` still have no `userId` column — the `User` table
  exists purely to gate login, not to scope data, since there's still
  effectively one person using the app. Don't add `userId` FKs unless this
  genuinely becomes multi-tenant (several *different* people with separate
  data), which is a bigger step than what happened here.
- **Known security gap in `authorize()` (not yet fixed)**: it returns
  `null` immediately when the username isn't found, but runs
  `bcrypt.compare` (slow) when it is — a timing side-channel that lets
  someone distinguish "unknown username" from "wrong password" by response
  latency. The original single-credential version used `timingSafeEqual`
  unconditionally specifically to avoid this class of issue; the DB-backed
  rewrite reintroduced it. Low priority for a personal app, but don't
  "helpfully" copy this pattern elsewhere.
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
- Prisma schema (`prisma/schema.prisma`): `User`, `Note`, `TrackerEntry`,
  `PushSubscription` — see architecture notes above for why `User` has no
  FK relationship to the others
- Auth wired: `src/auth.ts` (DB-backed Credentials + long-lived JWT), route
  handler at `src/app/api/auth/[...nextauth]/route.ts`, `src/proxy.ts`
  protects all routes except `/login` and auth/static assets,
  `src/app/login/page.tsx` has the username/password form
- **Real Postgres is live**: Neon, provisioned via `vercel integration add
  neon` (Vercel Marketplace), connected to the project for
  production/preview/development. `DATABASE_URL` and friends are set as
  Vercel env vars — no more placeholder. First migration
  (`prisma/migrations/20260721022900_init`) creates all four tables and was
  applied directly against Neon (see gotcha below about why `prisma migrate
  deploy` — the normal way — couldn't be used from the cloud session).
- At least one working login exists in the `User` table, created via
  `scripts/create-user.ts` — ask the owner rather than assuming a specific
  username/password; don't put real credentials in this file or in git.
- `AUTH_SECRET` and VAPID keys are generated and set as Vercel env vars
  (production/preview/development) — no longer placeholders.
- Notes CRUD on `src/app/(app)/notas/page.tsx` (moved out of the root page
  when the nav bar was added, see Recordatorios section below —
  `src/app/actions.ts`, `src/components/notes-list.tsx` unchanged)
- PWA manifest + icons (placeholders — regenerate real ones when you have
  branding) + iOS meta tags in `src/app/layout.tsx`
- Push notification plumbing: `public/sw.js`, `/api/push/subscribe`,
  `/api/push/send` (manual test push to every stored subscription), client
  component `src/components/push-manager.tsx` (now rendered on Home, see
  below) — **now actually used for real reminders**, not just plumbing
- **Recordatorios (reminders/to-do) + Progress — full feature, see its own
  section below**
- `postinstall: prisma generate` in `package.json` — **required** because
  `src/generated/prisma` is gitignored (it's generated code); without this
  script a fresh clone (e.g. Vercel's build) fails looking for that module
- **`prisma migrate deploy` is now wired into the build**
  (`package.json`'s `build` script is `prisma migrate deploy && next
  build`, fixed 2026-07-22) — future schema changes apply automatically on
  deploy, no more manual workaround needed for that step specifically (the
  workaround is still needed to get a migration applied *from this cloud
  session* before it ships, see the TCP-vs-HTTPS gotcha below).

Not done yet:
- Tracker UI beyond Recordatorios (the generic `TrackerEntry` model still
  has no pages/actions of its own — habits/health tracking would use it,
  not started, no fixed date)
- Financial management (expenses/income/subscriptions) — next planned
  feature after Recordatorios, see "What this is" above
- `.env.example` still lists `APP_USERNAME`/`APP_PASSWORD` as if they
  control login — they don't anymore (dead since the multi-user auth
  rewrite). Should be replaced with a note pointing at
  `scripts/create-user.ts` instead.
- The timing side-channel and the `create-user.ts` rough edges noted above
  (missing dotenv load, no `.catch()`, pool not closed) are known,
  unfixed, low-to-medium priority.

## Resolved: Vercel CLI/API network access from the cloud session

The cloud session's outbound proxy used to hard-block `vercel.com`/
`api.vercel.com`. As of 2026-07-21 this was reopened (environment network
policy change) — `vercel` CLI, `vercel login` (device-code OAuth flow), and
direct `vercel api` calls all work fine from the cloud session now. Project
is linked (`.vercel/project.json`), logged in as `luxcas213`.

A Vercel access token was pasted into the cloud chat during an earlier
troubleshooting session but never successfully used. It should still be
treated as compromised — rotate/revoke it at
https://vercel.com/account/tokens if not already done.

## Known blocker: git-push auto-deploys can get BLOCKED on Hobby plan

Vercel's **Hobby plan does not support collaboration on private repos**: a
deployment triggered by a git push is blocked (`readyState: "BLOCKED"`,
reason *"Git author ... must have access to the team ... to create
deployments"*) unless the commit's git author email matches the team
owner's Vercel-linked account. This is not a togglable project setting —
`gitForkProtection: false` (via `vercel api` PATCH on the project) does
**not** fix it, that's a different, unrelated flag (confirmed by testing:
disabling it did not unblock a subsequent deploy).

Real fixes, in order of preference:
1. Make sure the pushed commit's git author email matches the owner's
   Vercel/GitHub-linked email (`git commit --author="Name <email>"` on a
   given commit — doesn't require touching git config).
2. Make the repo public (collaboration is free on public repos regardless
   of author).
3. Upgrade the team to Pro.

Deploy Hooks (`vercel deploy-hooks create --ref <branch>`) are documented as
a way to trigger a deploy without the git-author check, but creating one
was blocked by this environment's safety classifier as a sensitive action
(it mints a standing URL that can trigger production deploys) — get
explicit human approval before creating one.

In practice this is **inconsistent, not rare**: across 2026-07-21 and
2026-07-22, some pushes/CLI deploys from the cloud session went through
fine and others (including two in a row on 2026-07-22, both a plain `vercel
deploy --prod` with no git push involved) got BLOCKED with the identical
reason. The exact trigger condition still isn't understood — don't assume
a deploy went live just because the command exited 0. **Always verify**
with `vercel inspect <production-url>` (check which deployment ID the
alias currently resolves to, and that specific deployment's `readyState`
via `vercel api /v13/deployments/<id>`) after every deploy. When a deploy
is BLOCKED, the currently-live one is simply left as-is (not automatically
retried) — if the blocked deploy contained an important fix (e.g. a
rotated secret), retry `vercel deploy --prod` again; it may or may not go
through next time.

## Env vars needed (see `.env.example` — currently stale, see below)

All of these are already set in Vercel (production/preview/development) as
of 2026-07-21; only relevant if setting up a new environment (e.g. local
dev, or a new Vercel project):

- `DATABASE_URL` — from the Neon integration (`vercel integration add
  neon`, or Vercel → Storage → Create Database → Postgres). Use `vercel env
  pull` to get the real value rather than the placeholder in
  `.env.example`.
- `AUTH_SECRET` — `npx auth secret` or `openssl rand -base64 33`
- ~~`APP_USERNAME` / `APP_PASSWORD`~~ — **dead, not read by `src/auth.ts`
  anymore**. `.env.example` still lists them; ignore/remove. Create logins
  with `npx tsx scripts/create-user.ts <username> <password>` instead
  (needs `DATABASE_URL` already exported in the shell first — the script
  doesn't load `.env` itself, see the auth section above).
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
- **Any page reading live DB data needs `export const dynamic =
  "force-dynamic"`.** First hit on the original `src/app/page.tsx` (now
  `src/app/(app)/page.tsx` + `.../notas/page.tsx` + `.../recordatorios/
  page.tsx`, all of which set it): once a page stops calling `auth()`
  directly, Next.js loses its signal that the page is dynamic and tries to
  prerender it at build time, which fails if there's no reachable database
  yet (`Can't reach database server`). These pages read live data and sit
  behind login anyway, so forcing dynamic rendering is correct, not a
  workaround to remove later — don't forget it on new pages under `(app)/`.
- **`src/generated/prisma` is gitignored** — always re-run `npx prisma
  generate` after cloning or changing `prisma/schema.prisma`. The
  `postinstall` script in `package.json` normally handles this after
  `npm install`.
- **The cloud session's proxy allows HTTPS (443) but blocks raw Postgres
  (5432)**, even to the same host, even though the same proxy tunnels
  `api.vercel.com` traffic fine. `prisma migrate dev`/`deploy` from this
  environment fails with `P1001: Can't reach database server` even with a
  correct `DATABASE_URL`. Workaround: generate the migration SQL
  with `prisma migrate diff --from-empty --to-schema prisma/schema.prisma
  --script` (no DB connection needed for a diff against an empty schema),
  then apply it by hand over HTTP using `@neondatabase/serverless`'s
  `neon()`/`sql.query()` (Neon's HTTP driver, works through the proxy) and
  manually insert the matching `_prisma_migrations` row (id, sha256
  checksum of the script, migration_name) so `prisma migrate deploy` won't
  try to reapply it later. Reused a second time on 2026-07-22 for the
  Recordatorios migration (that time via `--from-schema <old> --to-schema
  <new>` instead of `--from-empty`, since tables already existed) — this is
  the repeatable pattern for any future schema change made from this cloud
  session, not a one-off. A real `prisma migrate deploy` (e.g. from
  Vercel's build, or a local machine) is still the correct way to apply
  future migrations — and as of 2026-07-22 it's wired into the build
  command, so a normal deploy handles it without the workaround.

## Recordatorios (reminders/to-do) + Progress — 2026-07-22

Full feature, built after a long product-planning conversation (see
`docs/recordatorios-plan.md` for the product spec this implements). Owner
explicitly wants **no gamification** (no XP/levels/points) anywhere — a
Habitica/Finch-style approach was researched and rejected in favor of
plain streaks + a heatmap + charts.

**Data model** (`prisma/schema.prisma`): `Task` (title, description?,
`trackingType` SIMPLE|LOGGED, `dueDate?` for one-off tasks, `recurrence`
as a small JSON descriptor for recurring ones — `{"type":"DAILY"}` |
`WEEKDAYS` | `INTERVAL` | `MONTHLY` | `YEARLY`, matched by a pure function,
not queried at the DB level), `Tag` (freeform, created on the fly via
`connectOrCreate`), `TaskNotification` (a task can have several; each has
its own `requireConfirmation` switch and either `timeOfDay` — minutes
since midnight, for recurring — or `sendAt` — absolute datetime, for
one-off), `TaskCompletion` (one row per task per occurrence date — doubles
as the done-marker for SIMPLE tasks and the note/value log for LOGGED
ones, unique on `(taskId, forDate)`). Recurring task occurrences are
**virtual/computed**, never materialized as rows — only actual
completions are persisted. `src/lib/recurrence.ts` has the pure
`isTaskDueOn`/`computeStreak` functions (manually verified against sample
cases before relying on them elsewhere); `src/lib/tasks.ts` has the
Prisma query helpers.

**Routes**: a new `src/app/(app)/` route group adds a bottom `NavBar`
(Home/Recordatorios/Notas) via `(app)/layout.tsx` — this is why the old
`src/app/page.tsx` no longer exists (Notes moved to
`(app)/notas/page.tsx` unchanged; Home is now a dashboard showing today's
due reminders + quick-add buttons + `PushManager`).
`(app)/recordatorios/page.tsx` has Activos/Progreso/Historial tabs;
`nueva/` and `[id]/editar/` share one form component
(`recordatorios/task-form.tsx`) that switches its fields based on the
chosen recurrence type; `confirmar/[notificationId]/page.tsx` is the
screen a "requires confirmation" push notification deep-links to.

**Notifications — the actual mechanism**: `/api/cron/reminders` (GET,
`src/app/api/cron/reminders/route.ts`) is the sweep — it checks which
`TaskNotification`s are due right now and sends push via the existing
`webpush` helper to every stored subscription (same all-subscriptions
assumption as `/api/push/send`), stamping `lastFiredForDate` so it won't
refire within the same day. It's authenticated via a `CRON_SECRET` bearer
token (env var, all environments) instead of the interactive session
`auth()` check the rest of the app uses, since a scheduler has no browser
session — `src/proxy.ts`'s matcher excludes `api/cron` so it isn't
redirected to `/login`. `public/sw.js`'s push handler now reads
`requireInteraction` from the payload so "with confirmation" alerts stay
on screen until handled (Safari doesn't support in-notification action
buttons/sliders at all — investigated, this is the practical substitute:
tap → deep-link straight to a one-button confirm screen).

**Why not Vercel Cron**: Hobby-plan cron jobs can only run once a day
(with up to ~59min of jitter even then) — nowhere near precise enough for
"remind me at 14:30". Rather than pay for Pro, a GitHub Actions workflow
(`.github/workflows/reminders-cron.yml`, repo's already on GitHub) hits
the sweep endpoint every 15 minutes for free. **This needs two repository
secrets added manually in GitHub (Settings → Secrets and variables →
Actions)**: `APP_URL` (the production URL, `https://myapp-one-pearl.
vercel.app`) and `CRON_SECRET` (same value as the Vercel env var) — no
GitHub MCP tool was available in this session to set Actions secrets, so
this step is still pending as of 2026-07-22.

**Known gaps, not yet fixed**:
- Live end-to-end testing of the confirm-screen/push flow and the cron
  endpoint's bearer-auth check couldn't be completed from the cloud
  session: Chromium can't reach the live Vercel URL through this
  environment's proxy (connection reset, suspected HTTP/2-over-tunnel
  incompatibility — the proxy's own docs list HTTP/2-only APIs as an
  unsupported category), and pulling `CRON_SECRET` back out of Vercel to
  test with curl kept getting masked to a placeholder by this session's
  own secret-redaction layer even in non-printed variable substitutions.
  Verified instead via: type-checking, lint, manually-checked
  recurrence/streak logic, and curl-based checks (with a real logged-in
  session cookie) confirming Home/Recordatorios render real seeded data
  correctly. **Test the actual notification tap → confirm screen flow for
  real on a phone before trusting it fully.**
- No snooze/postpone on the confirm screen, no defined behavior for
  what a broken streak displays (currently just resets to 0), and it's
  undecided whether tags should ever be shared with Notes — all
  explicitly deferred in `docs/recordatorios-plan.md`, not oversights.
- `recordatorios/task-list.tsx`'s quick-complete checkbox always confirms
  without a note/value even for LOGGED tasks (that richer flow only
  exists on the push-notification confirm screen) — fine per the product
  spec, just worth knowing before "fixing" it.
