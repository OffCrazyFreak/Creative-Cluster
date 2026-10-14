# Architecture

How the code is laid out and how a request, a save and a background job move through it. Facts here come from the code in this repository; where something is a plan rather than code, it says so.

## One app, two sites

`VITE_SITE_ID` (`rpcc` or `dnz`) is read in `vite.config.ts` at build time. `src/sites/index.ts` exports the matching config object (`src/sites/rpcc.ts` or `src/sites/dnz.ts`, both typed by `ISiteConfig`); Vite inlines the id so the other site's config is dropped from the bundle. Node scripts have no `import.meta.env`, so they read `process.env.VITE_SITE_ID`. The site config holds name, origin, locales, allowed entry kinds, tag seed, funding line, contact and legal identity. Texts that differ per site live in the config or in Paraglide messages with a site parameter.

Each site has its own database. Nothing in the code connects the two.

## Folders

- `src/routes/`: file routes only. A route validates its URL, runs a loader and renders one feature component. `src/routeTree.gen.ts` is generated.
- `src/features/<area>/`: one folder per area (account, admin-entries, admin-users, apply, auth, changes, connections, contact, directory, entry, images, legal, lifecycle, location, map, matching, opportunities, review, session, tags, translation). Inside: `<area>.functions.ts` (server functions), `*.server.ts` (server-only services and queries), `<area>-schemas.ts` (Zod schemas and types), `<area>-queries.ts` (TanStack Query options), `components/`, `hooks/`.
- `src/db/`: Drizzle schema in `schema/`, client in `client.server.ts`, column helpers. Migrations are in `drizzle/`.
- `src/lib/<adapter>/`: adapters behind small interfaces: auth, email, geocoding, translation, images, analytics, turnstile, limits, jobs, change-log, maintenance, monitoring, privacy, rich-text, seo.
- `src/server/`: guards, error classes, request helpers, CSP and security headers.
- `src/components/ui/`: shadcn components. `src/components/custom/`: shared components (layout, form, rich text, errors).
- `src/constants/`, `src/utils/`, `src/hooks/`, `src/typings/`: shared code. Enum values (entry kinds, statuses, link kinds, job types) are `as const` arrays in `src/constants/`, used by the database CHECKs, Zod and the UI.
- `src/emails/`: React Email templates; copy comes from the `email_*` Paraglide messages.
- `messages/<area>/{en,hr}.json`: Paraglide messages. `src/paraglide/` is generated.
- `netlify/functions/`: background and scheduled functions. `scripts/`: Node scripts run with `tsx`. `tests/`: guard test, security header test, shared test helpers; feature tests sit next to their code.

## Guards

Every server function is a direct `createServerFn(...)` call in a `*.functions.ts` file. Its first middleware is exactly one guard from `src/server/guards.ts`:

- `publicGuard`: reads the session without a fresh database check; a blocked user is treated as signed out.
- `memberGuard`: requires a session and a user who is not blocked.
- `adminGuard`: like `memberGuard`, and the role must be `admin`.

The next call is `.inputValidator(zodSchema)`, then a thin `.handler` that calls a service in a `*.server.ts` file. `tests/guards.test.ts` parses every file in `src/` with the TypeScript compiler API and fails if a server function is unguarded, unvalidated, outside a `*.functions.ts` file, or if a raw server route is not on its allowlist (auth, Resend webhook, image route, sitemap, robots, healthz, the public map JSON, security.txt). Wrapping `createServerFn` in a helper breaks the Start compiler, so the rule is enforced rather than abstracted.

Ownership is not a guard. Services check it in the same SQL statement (`where id = $1 and owner_user_id = $2`), and "missing" and "not yours" both throw `NotFoundError`. `src/start.ts` registers CSRF protection for server functions and the Sentry middleware. The `/admin` and `/account` layout routes redirect in `beforeLoad`, but that is convenience: the guards are the security boundary.

## Data flow

Read: a route loader calls `queryClient.ensureQueryData(<area>QueryOptions(...))`. The query function calls a server function, which runs its guard, validates input, and calls a service that queries Postgres through Drizzle. The component reads the same query with `useQuery`, so a refresh after an action is `invalidateQueries`.

Public visibility has one definition: `publicEntryCondition` in `src/features/entry/public-entry-filter.server.ts`. Every public query (directory, map, entry page, connections, opportunities, sitemap) uses it, so suspending an entry hides it and everything attached to it everywhere at once. `redactEntry` and `canSeeField` apply per-field visibility (public, members, hidden). The public map list is built by `map-directory.server.ts` and cached; after any publish, edit, suspend or archive the service calls `invalidateMapDirectory()`.

Write: a service function opens one transaction that (1) locks and updates the row, (2) writes a `change_log` row with `writeChange` (before and after, source `owner`, `admin`, `import` or `system`), and (3) enqueues any side effect as a `job` row. Entry status changes go through one function, `transitionEntry` in `src/features/lifecycle/entry-transitions.server.ts`. Undoing a change writes a new log row; it never edits history.

Browser state: filters and paging live in the URL (Zod-validated search params with `.catch()` defaults); the map viewport is one `v=lat,lng,z` param.

## Auth and accounts

better-auth with the admin plugin (`src/lib/auth/auth.server.ts`). Roles are `admin` and `member`. Accounts are created by invitation (`admin.createUser`, then a set-password email), by approving an application, or by claiming an imported listing through a one-time link (`src/features/auth/claim.server.ts`, only a token hash is stored). Google sign-in is optional and cannot create accounts. A database trigger keeps a minimum number of active admins.

## Jobs

Table `job` is an outbox. Types: `email`, `translate`, `geocode_retry` (`src/constants/jobs.ts`). Handlers register with `registerJobHandler` and are imported in `src/lib/jobs/job-handlers.server.ts`. `enqueueJob(tx, ...)` and `enqueueEmail(tx, ...)` are called inside the transaction of the change, with an idempotency key, so a mail exists exactly when the change does.

`drainJobs` claims due jobs by priority, runs the handler, and on error retries with backoff up to 5 attempts. A handler can return `{ deferUntil }` (used to push non-urgent mail to the next UTC day near the daily cap). Triggers: `triggerDrain()` after a save (production only: a POST to the `drain-jobs-background` function with an HMAC token derived from `BETTER_AUTH_SECRET`), the 15-minute scheduled function as a safety net, and `pnpm jobs:drain` locally. Slow jobs (translation) are only claimed by the background function because a scheduled function is cut off after about 30 seconds.

Mail goes out through `src/lib/email/send-email.server.ts`: Resend when `RESEND_API_KEY` is set, a console transport otherwise (refused in production).

## Scheduled work

Netlify scheduled functions (`netlify/functions/*-scheduled.mts`) run only on published production deploys:

- every 15 minutes: job drain safety net.
- 03:17 UTC daily: withdraw stale connection proposals; purge contact-form sender hashes.
- 05:00 UTC daily: daily maintenance (review digests, strip personal fields from old change-log rows, delete accounts past the erasure grace period, archive unclaimed imports after 12 months, purge expired applications).

GitHub Actions run the rest: CI on every pull request and push, Migrate after CI passes on `main`, Deploy (manual and Saturday), Backup (Sundays), DGU address refresh (monthly), and a monthly keep-alive that re-enables the scheduled workflows.

## Where to look

- Change an entry's lifecycle: `src/features/lifecycle/`.
- The review queue and untrusted edits: `src/features/review/`.
- Admin list, detail, transfer, merge, pin, slug and CSV export: `src/features/admin-entries/`.
- Security headers and CSP: `src/server/`, and `docs/security-and-monitoring.md`.
- Production setup and operations: `docs/runbook.md`.
