# Creative Cluster

One TanStack Start codebase that runs two websites from the same code:

- **Creative Cluster** (`VITE_SITE_ID=rpcc`): the Restorative Practices map of creative organisations. English first, Croatian second. Entry kinds: organization, outside partner.
- **Registar inovatora DNŽ** (`VITE_SITE_ID=dnz`): the innovators registry of Dubrovnik-Neretva County. Croatian first, English second. Entry kinds: organization, person, outside partner.

Each site has its own Netlify site and its own Postgres database. The previous app lives on the `legacy` branch. For the design decisions see `docs/architecture.md`; for accounts, DNS and day-to-day operations see `docs/runbook.md`; for headers, analytics and error monitoring see `docs/security-and-monitoring.md`.

## Stack

- TanStack Start (`@tanstack/react-start`, pinned exact) on Vite, React 19, TanStack Router, Query, Form and Table (the table only in `/admin/entries`).
- shadcn components on Base UI, Tailwind CSS. UI code uses plain shadcn with layout classes only, so a theme can be dropped into `src/styles.css`.
- Paraglide JS for Croatian and English messages, split per area under `messages/<area>/`.
- Drizzle ORM on Postgres: the `pg` driver locally, Neon's WebSocket pool in production (transactions need it). Migrations in `drizzle/`.
- better-auth (pinned exact) with the admin plugin, email and password plus optional Google sign-in.
- MapLibre GL with OpenFreeMap tiles. Geocoding through Geoapify, with Croatian address data (DGU) in the database.
- Resend with React Email for mail, Cloudflare Workers AI for machine translation, Cloudinary for image delivery, Cloudflare Turnstile against bots.
- PostHog (cookieless) for pageviews, Sentry for errors, UptimeRobot for uptime.
- Tooling: pnpm 12, Node 24 (downloaded by pnpm), TypeScript, ESLint, Prettier, Vitest, Dependabot.

Versions live in `package.json`; the lockfile is committed.

## Local setup

You need Git, Docker and pnpm 12. pnpm downloads the right Node version itself (`devEngines` in `package.json`), so you do not install Node.

### macOS

1. Install Docker Desktop and start it.
2. Install pnpm with the standalone installer from pnpm.io (or `corepack enable` if you already have Node), then check `pnpm --version` prints 12.x.

### Windows

1. Install Docker Desktop (WSL 2 backend) and start it.
2. Install pnpm with the standalone installer from pnpm.io (PowerShell).
3. Run the commands below in PowerShell, Git Bash or WSL. The repository forces LF line endings through `.gitattributes`, so keep Git's `core.autocrlf` at its default and do not convert files.

### Linux

1. Install Docker Engine with the compose plugin and make sure your user can run `docker` without sudo.
2. Install pnpm with the standalone installer from pnpm.io (or `corepack enable` if you already have Node).

### Then, on every system

```sh
git clone https://github.com/OffCrazyFreak/Creative-Cluster.git
cd Creative-Cluster
pnpm install
cp .env.example .env.local        # on Windows PowerShell: Copy-Item .env.example .env.local
```

Edit `.env.local`: replace the two `replace-with-...` secrets with random values (`openssl rand -base64 32`; on Windows without openssl, use `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`). The app refuses to start while they still begin with `replace-with`.

```sh
pnpm db:up                         # Postgres 18 in Docker on port 5433, creates cc_rpcc and cc_dnz
pnpm db:migrate
pnpm admin:create --email you@example.com --name "Your Name" --password "a long passphrase"
pnpm seed:dev                      # optional: tags and fake demo entries (refuses non-local databases)
pnpm dev                           # http://localhost:3000
```

For the registry, set `DATABASE_URL` in `.env.local` to the `cc_dnz` database (same line, `cc_rpcc` replaced by `cc_dnz`), run `pnpm db:migrate` and `pnpm admin:create ...` again (each database has its own accounts), then `pnpm dev:dnz` (port 3001). Run one site at a time per checkout: both compile Paraglide into `src/paraglide/`.

Without real accounts the app runs on stand-ins: no `RESEND_API_KEY` prints mail to the terminal (reset and invite links appear there), no Geoapify key skips geocoding, no Cloudflare keys skip machine translation, and the Turnstile test keys always pass. Mail only sends after you run `pnpm jobs:drain` (see Jobs).

## Environment variables

Server values are read at runtime and validated in `src/env.server.ts`. Values starting with `VITE_` are compiled into the browser bundle at build time and are validated in `src/env.client.ts`. Keys marked optional switch an adapter to a local stand-in when missing. `.env.example` has local values, `.env.ci` has dummy values for CI builds. Never commit real keys.

Required in production:

- `DATABASE_URL`: Postgres connection string. Locally the Docker database. In production the pooled Neon connection string for that site's database.
- `DATABASE_DRIVER`: `pg` (default) or `neon`. Set `neon` on Netlify.
- `BETTER_AUTH_SECRET`: signs sessions and tokens; also derives the token that protects the background job function. At least 32 characters. Generate with `openssl rand -base64 32`. Changing it logs everyone out.
- `BETTER_AUTH_URL`: the public origin of that site, for example `https://creativecluster.restorativepractices.xyz`. Used for auth callbacks and for the app to call its own background function.
- `PSEUDONYM_SECRET`: at least 32 characters. Keys the HMACs that offset people's map pins, hash contact-form senders and sign apply-form tokens. Generate like the auth secret. Changing it moves every person's pin and breaks open apply forms.
- `TURNSTILE_SECRET_KEY` and `VITE_TURNSTILE_SITE_KEY`: from the Cloudflare Turnstile widget of that site. Required in production; a Netlify build fails if the site key is one of Cloudflare's test keys.
- `VITE_SITE_ID`: `rpcc` or `dnz`. Required for a production build; the two Netlify sites differ in this value.

Optional (stand-in when missing):

- `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`: Resend account of that site. In production the app refuses to send without the API key. The webhook secret verifies bounce and complaint callbacks.
- `EMAIL_FROM`: sender, for example `Creative Cluster <noreply@send.example.org>`, on the domain verified in Resend. `EMAIL_DAILY_CAP`: daily mail cap (default 100, Resend's free daily limit).
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google sign-in for existing accounts (sign-up through Google is disabled).
- `GEOAPIFY_API_KEY`: address search and reverse geocoding. `GEOCODER_CONTACT`: contact address sent to geocoders that ask for one.
- `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_AI_TOKEN`: Workers AI for machine translation.
- `CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_CLOUD_NAME` (same value): image delivery through Cloudinary fetch.
- `SENTRY_DSN` and `VITE_SENTRY_DSN`: error reporting (server and browser). The same DSN enables CSP violation reports.
- `VITE_POSTHOG_KEY`: PostHog project key.
- `CSP_MODE`: `report-only` (default) or `enforce`. See `docs/security-and-monitoring.md`.
- `CLIENT_IP_HEADER`: header carrying the visitor IP, default `x-nf-client-connection-ip` (Netlify).

Build and tooling only:

- `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`: upload source maps during a Netlify build.
- `DATABASE_URL_UNPOOLED`: direct (non-pooled) connection used by `drizzle-kit migrate` when set; falls back to `DATABASE_URL`.

GitHub Actions secrets and variables are listed in `docs/runbook.md`.

## Scripts

- `pnpm dev`, `pnpm dev:dnz`: dev servers for each site (ports 3000 and 3001).
- `pnpm build:rpcc`, `pnpm build:dnz`: production builds into `dist/`. `pnpm build` uses `VITE_SITE_ID` from the environment (what Netlify runs).
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`: the checks CI runs. `pnpm format` writes Prettier fixes.
- `pnpm generate`: compiles Paraglide messages and the route tree (run by lint, typecheck and test).
- `pnpm db:up`: start the Docker database. `pnpm db:generate --name <what>`: write a migration from schema changes. `pnpm db:migrate`: apply migrations. `pnpm db:check`: verify the migration journal.
- `pnpm admin:create`: create an admin account (the first one; later admins are invited in `/admin/users`).
- `pnpm seed:tags`: starter tags for the site named by `VITE_SITE_ID` (safe to repeat; also used on a new production database). `pnpm seed:fake` and `pnpm seed:dev` (tags plus fake demo entries) refuse to run against a non-local database.
- `pnpm jobs:drain`: process queued jobs (mail, translation, geocoding retries) once, locally.
- `pnpm maintenance:run`: run the daily maintenance tasks once.
- `pnpm terms:notify`: queue the "terms changed" email to all accounts; needs `--yes` to actually queue.
- `pnpm dgu:import`: refresh the Croatian address data in the database. `pnpm geonames:build`: rebuild the town lists after changing `LOCATION_COUNTRIES`.
- `pnpm import:legacy-export`, `pnpm import:run`: turn the old organizations export into a staging file, then import it (idempotent; geocodes once). Run `import:run` against a local database first.
- `pnpm claims:prepare`, `pnpm claims:send`: create claim invites for imported listings, then send them. Sending needs `CLAIMS_SENDING_APPROVED=yes`, `--confirm`, a batch of 500 or fewer and a final import source text; wait for the project owner's go-ahead (see `docs/runbook.md`).
- `pnpm email:dev`: React Email preview server on port 3020.

## Deploy model

Two Netlify sites (one per website) build the same repository, branch `main`, with different environment variables. Merging to `main` does not deploy: `netlify.toml` sets `ignore = "exit 0"`, which cancels every build except build hooks. Production deploys come only from the Deploy GitHub Action: run manually (choose both, rpcc or dnz) or on its Saturday 06:00 UTC schedule. It first checks that CI and Migrate succeeded on the current `main` commit, then calls each site's Netlify build hook. Deploy previews are off.

CI (`.github/workflows/ci.yml`) runs formatting, lint, types, tests, the migration drift check and a migration run on an empty database, then builds both sites and greps the client bundle for server secrets.

## Backups and restore

The Backup workflow runs Sundays 02:30 UTC. For each site it runs `pg_dump -Fc --no-owner` against the unpooled database URL, encrypts the dump with `age` for the public key in the `BACKUP_AGE_RECIPIENT` secret, and stores it as a workflow artifact for 90 days. The matching private key is not in GitHub; whoever holds it can restore.

To restore into a scratch database (also the quarterly drill, see `docs/runbook.md`):

```sh
age -d -i backup-key.txt rpcc-YYYY-MM-DD.dump.age > rpcc.dump
pg_restore --no-owner --dbname "$TARGET_DATABASE_URL" rpcc.dump
```

Use a `pg_restore` whose major version is at least the dump's (the workflow uses `postgres:18`). Restore into an empty database (a scratch Neon project or the local Docker database), never straight over production. A Neon branch is a copy of its parent, so it is not empty.

## Migrations

Change the schema in `src/db/schema/`, run `pnpm db:generate --name <what>`, commit the new SQL file in `drizzle/` (never edit an applied one or anything in `drizzle/meta/`). Migrations must be additive: add a column or table first, ship code that uses it, and remove the old one in a later release. CI fails when the schema and migrations disagree. After a merge to `main`, the Migrate workflow applies pending migrations to both production databases once CI passed. Locally: `pnpm db:migrate`.

## Jobs and scheduled functions

Side effects never run inside a request. They are written to the `job` table in the same transaction as the change, then processed by a drain: types are `email`, `translate` and `geocode_retry`; failures retry with backoff up to 5 attempts. Netlify Functions in `netlify/functions/`:

- `drain-jobs-background`: started by the app after a save, protected by a token derived from `BETTER_AUTH_SECRET`; runs up to 5 minutes.
- `drain-jobs-scheduled`: every 15 minutes; the safety net for saves whose trigger failed and for deferred or retried jobs. Slow jobs (translation) are handed to the background function, which also claims any due job.
- `daily-maintenance-scheduled`: 05:00 UTC; review digests, change-log personal-field stripping, deletion of accounts past their grace period, archiving unclaimed imports after 12 months, purging expired applications.
- `expire-links-scheduled` and `purge-contact-scheduled`: 03:17 UTC; withdraw connection proposals unanswered for 60 days, and purge contact-form sender hashes.

Scheduled functions run only on a published production deploy of the site.

## Add a message area

Messages live in `messages/<area>/en.json` and `hr.json`, and every key starts with the area name (`admin_users_title`).

1. Create `messages/<area>/en.json` and `messages/<area>/hr.json` (start from `{ "$schema": "https://inlang.com/schema/inlang-message-format" }`).
2. Add `"./messages/<area>/{locale}.json"` to `pathPattern` in `project.inlang/settings.json`.
3. Run `pnpm generate`, then use `m.<area>_<key>()` from `@/paraglide/messages`.

Croatian copy uses "ti" and ungendered forms. Do not edit `src/paraglide/`.

## Troubleshooting

- `pnpm db:up` works but `cc_dnz` is missing: the init script only runs when the Docker volume is first created. Run `docker compose exec db psql -U cc -d cc_rpcc -c "CREATE DATABASE cc_dnz"`, or `docker compose down -v` to start over (this deletes local data).
- Port 5433 is taken: another Postgres uses it. Stop it, or change the port in `docker-compose.yml` and in `DATABASE_URL`.
- "Generate a real secret" on start: replace the `replace-with-...` values in `.env.local`.
- `Cannot find package '@/paraglide'` when running a script: run `pnpm generate` once.
- Pages show the wrong language or site after switching: stop the dev server, set `VITE_SITE_ID` (or use `pnpm dev:dnz`), start again. Do not run both sites from one checkout at the same time.
- No email arrives locally: mail goes to the job queue; run `pnpm jobs:drain` and read the terminal output.
- A test is skipped: database tests skip when no Postgres is reachable at `DATABASE_URL`; start `pnpm db:up`.
- Windows line-ending diffs: do not let Git convert to CRLF; the repository stores LF.
- A production build fails with "VITE_SITE_ID is required": set it in the Netlify environment of that site.
