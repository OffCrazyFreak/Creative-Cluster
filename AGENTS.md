# AGENTS.md

One TanStack Start app built twice from the same code: Creative Cluster (`VITE_SITE_ID=rpcc`, English first) and the DNŽ innovators registry (`VITE_SITE_ID=dnz`, Croatian first). Netlify hosts both, each with its own Neon Postgres database. `README.md` has the setup and `docs/architecture.md` the folder layout.

## Ask first

Put these to me instead of working around them: I say yes far more often than no.

- Ask before adding or renaming an environment variable.
- Ask before adding a dependency the task does not strictly require.
- Ask before adding anything that can bill; services, plans and CI stay free with no card, or hard-capped.
- Hand back interactive installers and `init` wizards, except `pnpm dlx shadcn@latest add <component>`, which you may run.

## Boundaries

- Never deploy or call a Netlify build hook; production deploys come only from the Deploy workflow and its Saturday schedule.
- Run `pnpm claims:send` only when I say so.
- Send mail to an imported contact only through a template `email-job-handler.server.ts` checks with `isSuppressed`.
- Never commit secrets or real keys; `.env.example` and `.env.ci` hold placeholders.
- When nothing reads a variable, delete it from Netlify, GitHub and local `.env` files, printing names only.
- Keep personal names and real contact data out of the repository, because it is public.
- Leave unrelated changes already in the worktree alone: no revert, reformat, stage or claim.
- Use pnpm only; never hand-edit a dependency entry or lockfile.
- Kill and find processes by PID or port; `.claude/hooks/guard-process.py` blocks `pkill -f` and `pgrep -f`, whose pattern matches their own shell.
- Edit nothing in `src/routeTree.gen.ts`, `src/paraglide/` or `drizzle/meta/`; run `pnpm generate` or `pnpm db:generate` instead.
- When an account or client fact is missing, use placeholder env values, local Docker Postgres, console email, fake seed data or `[[GAP]]` in legal text.

## Done means

- Run `pnpm check` until it passes; its tests need Postgres (`pnpm db:up`).
- When the schema changes, run `pnpm db:generate` and apply the migration to an empty database.
- Fix type errors in `src/`, `scripts/`, `netlify/` and `tests/`; ignore errors from generated files and dependencies.
- When a failure is unrelated to your change, report the command and the error, say it looks pre-existing, and leave it.
- Report a check I interrupted as not run, without re-running it.
- After editing `.claude/hooks/`, run `python3 .claude/hooks/guard-process.test.py`.
- Put docs in the same PR as their own `docs:` commit before the PR opens, and again if behaviour changes.
- List docs touched and those checked and left alone in your summary.

## Worktrees and git

- Create worktrees under `~/.t3/worktrees/Creative-Cluster/<name>`; `t3.json` installs dependencies in T3's, so run `pnpm install --frozen-lockfile` in any other.
- Run one site at a time per checkout, because both compile Paraglide into the same folder.
- Branches are `<type>/<kebab-description>`; rename T3's `t3/<hex>` branch before the first push.
- Fetch and merge the latest `origin/main` before resuming an open PR.
- Use one worktree and branch per PR into `main`, and commit, push and open the PR yourself.

## PRs and review

- Fill in `.github/PULL_REQUEST_TEMPLATE.md`.
- Write issue, commit and PR titles and bodies in plain words a newcomer can follow.
- Write every PR or issue reference as number plus short name, in chat, lists, tables, board cards, comments and bodies, even when repeated.
- Write "Part of #N (short name)" in a PR that does not finish the issue, and "Closes #N (short name)" in one that does.
- Give every PR one Sonnet `reviewer`.
- Run the CodeRabbit CLI on every PR, because `.coderabbit.yaml` turns automatic review off; when its quota is out, the `reviewer` is enough.
- For 5000+ changed lines, 50+ files, or auth, security, personal data or migrations, also run Greptile once when installed: `@greptileai review` or its CLI.
- Give those same big or sensitive PRs one `reviewer` per app area, and wait for each installed bot that has quota.
- When a change alters what renders, check every changed screen in the T3 preview, then ask me whether to attach screenshots.
- When the T3 Code preview browser is available, use it for previews and screenshots and for pages that block or error on fetch.
- Before any merge, settle every PR comment and review body, bots included.
- Settle each with the smallest fix for its cause and the same mistake elsewhere, or a reply with the reason, and resolve it.
- Merge with a merge commit once CI is green on the latest commit and review is settled, as the orchestrating session.
- As a delegate, report instead of merging.
- When you merge a PR, confirm its branch is pushed and merged, then remove its worktree, local and remote branch, test data and servers.
- As a subagent, delete your test data and stop your servers and containers before reporting, and list the branch and worktree you left.
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
- When the `frontend-design` skill is available, read it before generating or redesigning UI.
- Style UI freely on shadcn (Base UI) components, because the brand theme replaces the styling in `src/styles.css` later.
- Keep map colours in `src/features/map/map-colors.ts`, because MapLibre paint and canvas drawing cannot read CSS variables.
- Edit `src/components/ui/` (shadcn output) only where the primitive is the natural home; ours live in `src/components/custom/` or the feature folder.
- Use `site.baseLocale` from `src/sites`; `no-restricted-imports` in `eslint.config.js` rejects Paraglide's own.
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
- Write numeric dates in prose as `03.11.2026.` in Croatian and ISO `2026-11-03` in English; UI dates keep the locale formatter.
- Use straight quotes.
- Cite commits by full 40-character SHA.

## Commits

Write every commit in this template:

```text
type(scope): Imperative summary

Why paragraph: the problem and the reason, never repeating the subject.

Changes:
- Specific change

Notes: a tradeoff the reader would otherwise miss.
```

- Expect `.githooks/commit-msg` to reject an unknown type, a subject over 72 characters, em or en dashes, and attribution trailers.
- Add `Changes:` only for two or more separable parts, and `Notes:` only for a tradeoff.
- Leave the scope out when none fits, and otherwise reuse one from `git log`.
