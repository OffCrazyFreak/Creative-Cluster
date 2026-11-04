# AGENTS.md

One TanStack Start app built twice from the same code: Creative Cluster (`VITE_SITE_ID=rpcc`, English first) and the DNŽ innovators registry (`VITE_SITE_ID=dnz`, Croatian first). Netlify hosts both, each with its own Neon Postgres database. `README.md` has the setup and `docs/architecture.md` the folder layout.

## Ask first

Put these to me instead of working around them: I say yes far more often than no.

- Ask before adding or renaming an environment variable.
- Ask before adding a dependency the task does not strictly require.
- Ask before changing how the app looks (size, spacing, colour, layout), accessibility fixes and side effects included, with before and after screenshots.
- Ask before adding anything that can bill; services, plans and CI stay free with no card, or hard-capped.
- Hand back interactive installers and `init` wizards, except `pnpm dlx shadcn@latest add <component>`, which you may run.

## Boundaries

- Never deploy or call a Netlify build hook; production deploys come only from the Deploy workflow and its Saturday schedule.
- Run `pnpm claims:send` only when I say so, and check `isSuppressed` before any other mail to an imported contact.
- Never commit secrets or real keys; `.env.example` and `.env.ci` hold placeholders.
- Keep personal names and real contact data out of the repository, because it is public.
- Leave unrelated changes already in the worktree alone: no revert, reformat, stage or claim.
- Use pnpm only; never hand-edit a dependency entry or lockfile.
- Regenerate `src/routeTree.gen.ts`, `src/paraglide/` and `drizzle/meta/` with their commands, never by hand.
- When an account or client fact is missing, use placeholder env values, local Docker Postgres, console email, fake seed data or `[[GAP]]` in legal text.

## Done means

- Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build:rpcc` and `pnpm build:dnz` until they pass, with `pnpm size` after each build.
- When the schema changes, run `pnpm db:generate` and apply the migration to an empty database.
- Fix type errors in `src/`, `scripts/` and `tests/`; ignore errors from generated files and dependencies.
- When a failure is unrelated to your change, report the command and the error, say it looks pre-existing, and leave it.
- Report a check I interrupted as not run, without re-running it.
- Put docs in the same PR as their own `docs:` commit before the PR opens, and again if behaviour changes.
- List docs touched and those checked and left alone in your summary.

## Worktrees and git

- Create worktrees under `~/.t3/worktrees/Creative-Cluster/<name>` and run `pnpm install --frozen-lockfile` in each.
- Run one site at a time per checkout, because both compile Paraglide into the same folder.
- Branches are `<type>/<kebab-description>`; rename T3's `t3/<hex>` branch before the first push.
- Fetch and merge the latest `origin/main` before resuming an open PR.
- Use one worktree and branch per PR into `main`, and commit, push and open the PR yourself.

## PRs and review

- Fill in `.github/PULL_REQUEST_TEMPLATE.md`.
- Write issue, commit and PR titles and bodies in plain words a newcomer can follow.
- Write "Part of #N" in a PR that does not finish the issue, and "Closes #N" in one that does.
- Give every PR one Sonnet `reviewer`.
- Run the CodeRabbit CLI on every PR, because `.coderabbit.yaml` turns automatic review off; when its quota is out, the `reviewer` is enough.
- For 5000+ changed lines, 50+ files, or auth, security, personal data or migrations, also run Greptile once: `@greptileai review` or its CLI.
- Give those same big or sensitive PRs one `reviewer` per app area, and wait for CodeRabbit and Greptile.
- When a change alters what renders, check every changed screen in the T3 preview, then ask me whether to attach screenshots.
- Before any merge, settle every PR comment and review body, bots included, with the smallest fix, the same mistake elsewhere in the PR included, or a reply giving the reason.
- Merge once CI is green and review is settled, as the orchestrating session; a delegate reports instead of merging.
- Append anything a deploy needs (data step, migration, env step, post-deploy check) to the PR body, saying what is left and by whom.

## Board and issues

- Use project board 3, owner OffCrazyFreak, and always set Status.
- File each new issue atop Backlog through its own `researcher`, with fixed-SHA permalinks, sources, a fix plan and how to verify.
- Give a plan a tracking issue with the why, decisions, an ordered PR checklist and open questions.
- Set a tracking issue to In progress once its first PR runs, otherwise Backlog; tick each step its PR completes.
- Put owner-only steps (logins, payments, phone) as a draft at the top of In progress, with links and numbered steps.
- Move merged user-facing work to For review, and merged invisible work to Done.

## Code

- Write an `I`-prefixed Props interface in the component's file, one component per file, default export, kebab-case filenames.
- Read library docs through Context7 or the official docs for the installed version.
- For every dependency change, a single bump included, delete `node_modules` and `pnpm-lock.yaml`, then install, because a plain install keeps the old resolution.
- List the unrelated lockfile updates in the PR.
- Read the `frontend-design` skill before generating or redesigning UI.
- Build UI from plain shadcn (Base UI) with layout classes and shadcn's typography and border utilities, because a tweakcn theme lands in `src/styles.css` later.
- Add no hard-coded colours, font families, shadows or custom theme tokens; the theme supplies them.
- Edit `src/components/ui/` (shadcn output) only where the primitive is the natural home; ours live in `src/components/custom/` or the feature folder.
- Use `site.baseLocale` from `src/sites`, never Paraglide's `baseLocale`, because one inlang project serves both sites.
- Pass the locale explicitly in code outside a request (jobs, emails, scripts).
- Put constants and pure helpers that client code imports in `<area>-fields.ts`, because `<area>-schemas.ts` can pull in heavy parsers.

## Server functions

- Keep each `createServerFn(...)` call direct in a `*.functions.ts` file, because a wrapping helper breaks the compiler and leaks server code; `tests/guards.test.ts` checks the guard chain.
- Keep handlers thin: validate, call a service in a `*.server.ts` file, return plain data.
- Check ownership in the same SQL statement, and throw `NotFoundError` for both "missing" and "not yours".

## Data

- Generate ids as UUID v7 in the app.
- Define enums as `text` plus CHECK from one `as const` array in `src/constants/`, shared with Zod and the UI.
- Keep migrations additive (expand first, contract in a later release), and add a new one instead of editing an applied one.
- Write a `change_log` row in the same transaction as every service mutation of an entry, opportunity, link or tag.
- Run side effects (email, translation, geocoding retries) through the `job` table in the same transaction, never inline in the request.

## Copy and i18n

- Write en and hr with informal singular and ungendered forms, including `alt`, `title` and accessible names.
- Use Croatian "ti", never "vi"; the organisation voice "mi" stays.
- Write no arrow characters in any text; use words.
- Prefix message keys with their area, and register a new area in `project.inlang/settings.json`.

## Writing

- Explain in plain words, and define any jargon in one phrase.
- Write Markdown with one physical line per paragraph and bullet.
- Write numeric dates as `03.11.2026.` in Croatian text and ISO `2026-11-03` in English, with straight quotes.
- Cite commits by full 40-character SHA.

## Commit message

```text
type(scope): Short summary in imperative mood

Changes:
- Specific change

Brief explanation of why the change was needed.
```

Types: `feat`, `fix`, `docs`, `refactor`, `chore`, `style`, `perf`, `ci`, `test`. Scope is the feature area (`directory`, `auth`, `map`, ...).
