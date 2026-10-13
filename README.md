# Creative Cluster

One TanStack Start codebase that runs two sites:

- **Creative Cluster** (`VITE_SITE_ID=rpcc`): the Restorative Practices map of creative organisations, English first.
- **Registar inovatora DNŽ** (`VITE_SITE_ID=dnz`): the innovators registry of Dubrovnik-Neretva County, Croatian first.

The previous app lives on the `legacy` branch.

## Stack

TanStack Start on Vite, React 19, shadcn on Base UI, TanStack Query and Form, Paraglide for Croatian and English, Drizzle on Postgres (Neon in production), better-auth, MapLibre with OpenFreeMap tiles. Hosted on Netlify.

## Local setup (macOS, Windows, Linux)

Needs Docker and pnpm 12 (`corepack enable` or the pnpm installer). pnpm downloads the right Node version itself (see `devEngines` in `package.json`).

```sh
pnpm install
cp .env.example .env.local
pnpm db:up
pnpm db:migrate
pnpm admin:create --email you@example.com --name "Your Name" --password "a long passphrase"
pnpm dev
```

RPCC runs on http://localhost:3000. For the registry, set `DATABASE_URL` to the `cc_dnz` database in `.env.local`, run `pnpm db:migrate` once, then `pnpm dev:dnz` (port 3001).

## Checks

`pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build:rpcc`, `pnpm build:dnz`.

## Deploys

Merges to `main` do not deploy. Production deploys come from the Deploy GitHub Action (manual run) and its Saturday schedule, which call each site's Netlify build hook. Migrations run from the Migrate action when `drizzle/` changes.
