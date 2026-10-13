# AGENTS.md

One TanStack Start app built twice from the same code: Creative Cluster (`VITE_SITE_ID=rpcc`, English first) and the DNŽ innovators registry (`VITE_SITE_ID=dnz`, Croatian first). Netlify hosts both, each with its own Neon Postgres database. `CLAUDE.md` imports this file.

## Boundaries

Never:

- Commit or push anything beyond the pull request you were asked to raise. Commits carry no trailers (no `Co-Authored-By`, no generated-with lines), and never use `--no-verify`.
- Deploy or call a Netlify build hook. Production deploys come only from the manual Deploy action and the Saturday schedule.
- Commit secrets or real keys. `.env.example` and `.env.ci` hold placeholders only.
- Send claim emails or any email to imported contacts. They are prepared, never sent, until the owner says so.
- Hand-edit lockfiles or use npm. pnpm only.
- Edit a generated file: `src/routeTree.gen.ts`, `src/paraglide/`, `drizzle/meta/`.
- Put personal names or real contact data in the repository. It is public.

## How to work

- Build without check-ins: research the industry-standard way, do it, and note the choice in the pull request description.
- Work blocked on a real account, domain or client fact uses temporary values: placeholder env values, the local Docker Postgres, the console email transport, fake seed data, `[[GAP]]` markers in legal text.
- One pull request per phase or task group. Past about 400 changed lines (not counting tests, docs and generated files), split it into stacked pull requests that each leave the app working.
- Every pull request is reviewed with the code-review skill and the CodeRabbit CLI, and every finding is addressed or answered before merge.
- Edit only the lines that change. A bug fix gets a test that fails without the fix where this kind of code is tested.

## Definition of done

`pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build:rpcc` plus `pnpm build:dnz` pass. A schema change also needs `pnpm db:generate` and a migration that applies to an empty database. Say which checks ran and which did not.

## Code rules (from the Disscount project)

- Files are kebab-case and short (roughly 50 to 100 lines), split by concern. One component per file, default export, `I`-prefixed Props interface in the same file.
- `function name() {}`, not `const name = () => {}`, except small inline callbacks. `import { useState } from "react"`, never `React.useState`. No `any`: define the type or narrow `unknown`.
- Comments only for the why: business rules, security assumptions, workarounds. Never narrate the code.
- Prefer a library over hand-rolled code. Look for an existing helper in `src/utils/`, `src/lib/`, `src/hooks/`, the feature folder before writing a new one.
- UI is plain shadcn (Base UI) from `src/components/ui/` with layout classes only (flex, grid, gap, padding, width). No colours, fonts, shadows or custom theme tokens: a tweakcn theme is dropped into `src/styles.css` later. Our components live in `src/components/custom/` (shared) or the feature folder.
- Croatian copy uses "ti" and ungendered forms; the organisation speaks as "mi". No em or en dashes and no arrow characters in any text.

## Layout

- `src/routes/`: file routes only. A route file wires loaders and renders one feature component.
- `src/features/<area>/`: `<area>.functions.ts` (server functions), `*.server.ts` (server-only services and queries), `<area>-schemas.ts` (Zod schemas and types), `components/`, `hooks/`, `<area>-queries.ts` (TanStack Query options).
- `src/db/`: Drizzle schema (`schema/`), client (`client.server.ts`), column helpers.
- `src/lib/<adapter>/`: adapters behind small interfaces (auth, email, geocoding, translation, images, analytics, turnstile, limits).
- `src/server/`: guards, errors, request helpers. `src/sites/`: per-site config. `src/constants/`, `src/utils/`, `src/typings/`, `src/hooks/`: shared code.
- `messages/<area>/{en,hr}.json`: Paraglide messages, keys prefixed with the area (`directory_filter_tags`). Register a new area in `project.inlang/settings.json`.
- `scripts/`: Node scripts run with `tsx` (they load `.env.local` through `scripts/load-env.ts`).

## Server functions

- Every server function is a direct `createServerFn(...)` call in a `*.functions.ts` file. The first call is `.middleware([guard, ...])` with exactly one guard from `src/server/guards.ts` (`publicGuard`, `memberGuard`, `adminGuard`), then `.inputValidator(zodSchema)`, then `.handler`. `tests/guards.test.ts` fails otherwise. Wrapping `createServerFn` in a helper breaks the compiler and leaks server code to the client.
- Handlers stay thin: validate, call a service in a `*.server.ts` file, return plain data.
- Ownership checks live in the same SQL statement (`where id = $1 and owner_user_id = $2`). "Missing" and "not yours" both throw `NotFoundError`.
- Raw HTTP routes (`server.handlers`) are allowed only for the list in `tests/guards.test.ts`.

## Data

- Ids are UUID v7 from the app. Enums are `text` + CHECK from one `as const` array in `src/constants/`, shared with Zod and the UI.
- Migrations are additive (expand first, contract in a later release). Never edit an applied migration.
- Every service mutation of an entry, opportunity, link or tag writes a `change_log` row in the same transaction.
- Side effects (email, translation, geocoding retries) go through the `job` table in the same transaction, never inline in the request.

## Local setup

`pnpm install`, `cp .env.example .env.local`, `pnpm db:up`, `pnpm db:migrate`, `pnpm admin:create --email ... --name ... --password ...`, `pnpm dev` (RPCC on port 3000) or `pnpm dev:dnz` (port 3001, uses the `cc_dnz` database URL from `.env.local`). Run one site at a time per checkout: both compile Paraglide into the same folder.

## Commit message

```text
type(scope): Short summary in imperative mood

Changes:
- Specific change

Brief explanation of why the change was needed.
```

Types: `feat`, `fix`, `docs`, `refactor`, `chore`, `style`, `perf`, `ci`, `test`. Scope is the feature area (`directory`, `auth`, `map`, ...).
