# Runbook: handover and operations

For the person who runs the two sites after the build. Facts about services were read from the official pages linked below on 2026-10-14; anything marked UNVERIFIED was not on a page that was read and must be checked in the service's own dashboard. Plans and prices change, so re-check limits before relying on them. Placeholders in angle brackets are values you choose or copy from a dashboard.

Never paste a secret into the repository, an issue or a chat. Keep them in the Netlify environment, in GitHub secrets, and in the association's password manager.

## The two sites

- Creative Cluster: `VITE_SITE_ID=rpcc`, domain `creativecluster.restorativepractices.xyz` (from `src/sites/rpcc.ts`).
- Registar inovatora DNŽ: `VITE_SITE_ID=dnz`, domain `registar.inovatoridnz.net` (from `src/sites/dnz.ts`).

Each site needs its own set of the accounts below (its own Neon project, Netlify site, Resend account, Turnstile widget, Sentry project, and so on). The decision on record is one association Gmail address per site owning that site's accounts, with the project lead as admin on both sites and the clients adding more admins. Whether both Netlify sites sit in one Netlify team is UNVERIFIED and matters for the credit limit (see "If Netlify pauses").

## Accounts to create, in this order

Create the accounts first, collect the values, and only then fill Netlify and GitHub. Do it once per site.

1. **Association Gmail address** for the site. Everything below signs up with it.
2. **GitHub access** to the repository `OffCrazyFreak/Creative-Cluster`. Needed for secrets, variables and the Actions that deploy, migrate and back up.
3. **Neon** (database). Sign in at https://console.neon.tech, New Project, name it for the site, choose region AWS Europe (Frankfurt, `aws-eu-central-1`). The region cannot be changed after creation. Postgres defaults to 17 in Neon; the backup workflow dumps with `postgres:18` and the local Docker database is 18, so choose Postgres 18 in the project options if offered (UNVERIFIED that 18 is selectable; check). From the Connect dialog copy two strings: the pooled one (hostname contains `-pooler`) for `DATABASE_URL`, and the direct one (no `-pooler`) for `DATABASE_URL_UNPOOLED` and the GitHub secrets. Docs: https://neon.com/docs/manage/projects and https://neon.com/docs/connect/choose-connection.
4. **Cloudflare** (Turnstile and Workers AI), one account can serve both sites.
   - Turnstile: dashboard, Turnstile, Add widget; name it, add the site's hostname (hostname management), pick a mode. You get a site key (public, goes in `VITE_TURNSTILE_SITE_KEY`) and a secret key (`TURNSTILE_SECRET_KEY`). Restrict hostnames to the domains you control. Docs: https://developers.cloudflare.com/turnstile/get-started/ and https://developers.cloudflare.com/turnstile/get-started/widget-management/dashboard/.
   - Workers AI: dashboard, Workers AI, "Use REST API", "Create a Workers AI API Token" (needs Workers AI Read and Edit), and copy the Account ID from the same page. Values: `CLOUDFLARE_AI_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. The free allowance is 10,000 Neurons per day, reset at 00:00 UTC; beyond it requests fail on the Free plan (translation jobs then wait for the next reset). Docs: https://developers.cloudflare.com/workers-ai/get-started/rest-api/ and https://developers.cloudflare.com/workers-ai/platform/pricing/.
5. **Resend** (email), one account per site. See "Resend domain setup" below. Docs: https://resend.com/docs/dashboard/domains/introduction.
6. **Google Cloud** (sign-in with Google, optional). See "Google OAuth" below.
7. **Cloudinary** (image delivery) and **Geoapify** (address search): create an account each and copy the cloud name (`CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_CLOUD_NAME`) and the Geoapify API key (`GEOAPIFY_API_KEY`). UNVERIFIED: no official docs were read for these two, so use each dashboard's own instructions.
8. **Sentry**, an organization in the EU region. The region is chosen when the organization is created and cannot be changed afterwards (the only way is a new organization). Create a project per site, copy the DSN (Project Settings, SDK Setup, Client Keys) into `SENTRY_DSN` and `VITE_SENTRY_DSN`. For source maps create an Organization Token (Settings, Developer Settings, Organization Tokens; it is shown once) as `SENTRY_AUTH_TOKEN`, plus `SENTRY_ORG` and `SENTRY_PROJECT` (slugs). Free plan at the time of reading: 5k errors, 30-day lookback. Docs: https://docs.sentry.io/organization/data-storage-location/, https://docs.sentry.io/product/sentry-basics/dsn-explainer/, https://docs.sentry.io/account/auth-tokens/.
9. **PostHog**, Cloud EU (Frankfurt). Copy the project token from project settings into `VITE_POSTHOG_KEY`. The app uses cookieless mode, which needs the project setting "Cookieless server hash mode" switched on (Project Settings, Web analytics). The app sends events through `/ingest-cc` on its own domain (redirects in `netlify.toml`). Docs: https://posthog.com/docs/privacy/gdpr-compliance and https://posthog.com/docs/libraries/js. UNVERIFIED: how the EU region is chosen at signup.
10. **Netlify**, two sites. See "Netlify settings".
11. **UptimeRobot**, after the sites are live. See "Monitoring".
12. **Google Search Console**, after the sites are live. See "Search Console".

## GitHub secrets and variables

Repository settings, Secrets and variables, Actions. Names come from the workflows in `.github/workflows/`.

- `DATABASE_URL_UNPOOLED_RPCC`, `DATABASE_URL_UNPOOLED_DNZ`: the direct Neon strings. Used by Migrate, Backup and the DGU refresh.
- `NETLIFY_BUILD_HOOK_RPCC`, `NETLIFY_BUILD_HOOK_DNZ`: the build hook URLs. Used by Deploy.
- `BACKUP_AGE_RECIPIENT`: the public `age1...` key that encrypts backups. Create the pair with `age-keygen -o backup-key.txt`; it prints the public key and the file holds the private identity. Store the private file offline (password manager and one more place), never in GitHub. Docs: https://github.com/FiloSottile/age.
- Variable `PRODUCTION_READY` = `true`, set once everything above exists. Until then Migrate, Backup and Deploy skip a missing secret; after it is `true`, a missing secret fails the run, which is what you want. The DGU address refresh ignores this variable and always skips silently without its database secret, so after adding the secrets run it once by hand (Actions, DGU address refresh, Run workflow) and look at the log: the Croatian address search needs that data.

## Netlify settings

Create each site at https://app.netlify.com/start (or Add new project), connect the GitHub repository, branch `main`. Build settings come from `netlify.toml` (`pnpm build`, publish `dist/client`, Node 24), which override the UI. Docs: https://docs.netlify.com/welcome/add-new-site/ and https://docs.netlify.com/build/configure-builds/overview/.

- **Deploy previews and branch deploys: off.** Merges to `main` must not build: `netlify.toml` has `ignore = "exit 0"`, and build hooks bypass it ("Build hooks bypass ignore", https://docs.netlify.com/build/configure-builds/ignore-builds/). Production deploys come only from the Deploy GitHub Action.
- **Build hook:** Project configuration, Developer settings, Continuous deployment, Build hooks, Add build hook (name it, branch `main`). Copy the URL into the GitHub secret for that site. Treat the URL as a password. Docs: https://docs.netlify.com/build/configure-builds/build-hooks/.
- **Environment variables:** Project configuration, Environment variables, Add a variable (or Import from a .env file). Docs: https://docs.netlify.com/build/environment-variables/get-started/.
  - Scopes: Builds, Functions, Runtime, Post processing. The scheduled and background functions read `DATABASE_URL`, `BETTER_AUTH_SECRET` and the other server values at run time, so tick **Functions** for every server value, and **Builds** for every `VITE_*` value and the `SENTRY_*` build values. The docs say a variable must include the Functions scope to reach functions (https://docs.netlify.com/build/functions/environment-variables/), but one page ties scope selection to paid plans and another does not, so confirm in the UI what the Free plan offers (UNVERIFIED).
  - Values declared in `netlify.toml` only get Builds and Post processing scope, so keep secrets out of the file.
  - Set per site: `VITE_SITE_ID` (`rpcc` or `dnz`), `DATABASE_URL` (pooled), `DATABASE_DRIVER=neon`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (the site's `https://` origin), `PSEUDONYM_SECRET`, `TURNSTILE_SECRET_KEY`, `VITE_TURNSTILE_SITE_KEY` (a real key: the build fails on Cloudflare's test keys), then the optional ones from the README as the accounts come online (`RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `EMAIL_FROM`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GEOAPIFY_API_KEY`, `GEOCODER_CONTACT`, `CLOUDFLARE_*`, `CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_CLOUD_NAME`, `SENTRY_*`, `VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY`).
  - Generate the two secrets with `openssl rand -base64 32`, different per site and different from each other.
  - Leave `CSP_MODE` unset (Report-Only) for the first two weeks, then follow `docs/security-and-monitoring.md`.
  - A changed variable only reaches the running site after the next deploy; run the Deploy action.
- **Custom domain:** Project overview, Domain management, Add a domain, "Add a domain you already own". Docs: https://docs.netlify.com/manage/domains/get-started-with-domains/.
- **Scheduled functions** (`netlify/functions/*-scheduled.mts`) run only on a published production deploy, in UTC, with a 30 second limit. The background function can run up to 15 minutes. Docs: https://docs.netlify.com/build/functions/scheduled-functions/ and https://docs.netlify.com/build/functions/background-functions/. After the first deploy, open the site's Logs, Functions page and confirm the scheduled functions appear and run (UNVERIFIED where exactly in the UI).

## DNS records to add

The domains' DNS is held outside this project (who holds it: UNVERIFIED, the project lead is checking). Add these at the DNS provider of each domain. Subdomains and the records themselves are below; copy exact values from the dashboards.

- Site subdomain (`creativecluster` under `restorativepractices.xyz`, `registar` under `inovatoridnz.net`): a `CNAME` to `<netlify-site-name>.netlify.app`. For an apex name Netlify documents an ALIAS or ANAME to `apex-loadbalancer.netlify.com`, or an A record to `75.2.60.5` where CNAME flattening does not exist. Source: the Netlify domains page above. Propagation can take up to 24 to 48 hours; check with `dig`. Netlify provisions the HTTPS certificate automatically; how long it takes on external DNS and what to click if it stalls is UNVERIFIED (check the site's Domain management page).
- Keep the `restorativepractices.xyz` apex redirect working (decision on record).
- Resend: the SPF TXT, DKIM TXT and MX return-path records for the `send.` subdomain, exactly as the Resend domain page shows them (see below). Exact hostnames are UNVERIFIED here.
- DMARC: a TXT record at `_dmarc` on the parent domain, `v=DMARC1; p=none; rua=mailto:<report address>`, for reports with no enforcement (decision on record: `p=none`). The record format is the standard DMARC one; it was not checked against a provider page.
- Cutover (from the spec, section 18): lower the TTL a day ahead, test with `curl --resolve <domain>:443:<netlify-ip> https://<domain>/healthz` before switching, switch the CNAMEs at a quiet hour (a few minutes of certificate gap are accepted), keep the old server for two weeks and take a final dump before shutting it down, then watch the certificate issue.

## Resend domain setup

Per site. Docs: https://resend.com/docs/dashboard/domains/introduction and https://resend.com/docs/api-reference/domains/create-domain.

1. Add the domain in the Resend dashboard using a subdomain of the site's domain (Resend recommends a subdomain for reputation isolation; the plan is `send.<domain>`). Choose the EU region (`eu-west-1` in the API). The dashboard wording for this step is UNVERIFIED.
2. Add the records Resend lists (SPF TXT, DKIM TXT, MX return-path, optional tracking CNAME; open and click tracking stay off) at the DNS provider, then verify. The API defaults the return-path to `send`, which on a `send.` subdomain may give `send.send.<domain>`; read the dashboard before copying (inference, UNVERIFIED).
3. Create an API key with Sending access, restricted to this domain (https://resend.com/docs/dashboard/api-keys/introduction). The value is shown once. Put it in `RESEND_API_KEY`.
4. Set `EMAIL_FROM` to an address on that domain, for example `Creative Cluster <noreply@send.<domain>>`.
5. Webhook: add an endpoint `https://<site origin>/api/webhooks/resend` and select the events `email.bounced`, `email.complained` and `email.suppressed` (the handler in `src/features/contact/resend-webhook.server.ts` acts on these; `email.failed` is only logged). Copy the signing secret into `RESEND_WEBHOOK_SECRET` (https://resend.com/docs/webhooks/introduction). Affected entries can be found with the "Contact email invalid" filter in `/admin/entries`.
6. Free plan at the time of reading: 100 emails per day, 3,000 per month, 3 custom domains (https://resend.com/docs/knowledge-base/account-quotas-and-limits). The app caps itself with `EMAIL_DAILY_CAP` (default 100) and defers non-urgent mail to the next UTC day near the cap.

## Google OAuth (optional sign-in)

Per site. Sign-in with Google only works for existing accounts (sign-up is disabled in `src/lib/auth/auth.server.ts`).

1. In Google Cloud, set up the consent screen (Google Auth Platform: Branding, Audience, Data Access): https://support.google.com/cloud/answer/15544987. Whether the basic sign-in scopes need Google verification before the app can leave Testing is UNVERIFIED; check the Verification Center.
2. Google Auth Platform, Clients, Create client, type Web application: https://support.google.com/cloud/answer/15549257. Authorized redirect URI: `https://<site origin>/api/auth/callback/google` (better-auth's documented path, https://better-auth.com/docs/authentication/google). Redirect URIs must be HTTPS except localhost; changes can take minutes to hours.
3. Copy the client ID and secret (the secret is shown after creation) into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Redeploy.

## Neon

- Free plan at the time of reading: 6 hour history window, 1 GB storage per project, 100 compute-hours per project per month, compute suspends after 5 minutes idle and wakes on the next query; when limits are exceeded compute suspends until the next billing cycle, and at the storage cap writes fail (https://neon.com/docs/introduction/plans, https://neon.com/docs/introduction/scale-to-zero). Check the Neon console usage page monthly with the Netlify check.
- The 6 hour window means Neon's own restore is only for very recent mistakes. The encrypted weekly dump is the real backup.

## Create the first admin

On a trusted machine with the repository set up, run the script against the production database once, passing the URL only for that command so it does not land in `.env.local`:

```sh
pnpm exec cross-env DATABASE_URL="<pooled production URL>" DATABASE_DRIVER=neon VITE_SITE_ID=<rpcc or dnz> pnpm admin:create --email <address> --name "<name>" --password "<long passphrase>"
pnpm exec cross-env DATABASE_URL="<pooled production URL>" DATABASE_DRIVER=neon VITE_SITE_ID=<rpcc or dnz> pnpm seed:tags
```

`cross-env` (already a dev dependency) sets the variables the same way in PowerShell, fish and bash; the second command loads the site's starter tags (safe to repeat).

Run it only after the migrations were applied (the Migrate workflow). UNVERIFIED: this exact invocation against Neon was not run; try it on a scratch Neon project first. Further admins are invited from `/admin/users`.

## Monitoring

- UptimeRobot (free plan at the time of reading: 50 monitors, 5 minute interval): "+ Add New Monitor", HTTP(s), URL `https://<site origin>/healthz`, set alert contacts to two people and assign them to the monitor. `/healthz` runs `select 1`, so it fails when the app or the database is down. A contact must be assigned to a monitor or no alert is sent. Docs: https://uptimerobot.com/pricing/ and https://help.uptimerobot.com/en/articles/11358364-how-to-create-your-first-monitor. Because of Neon's scale to zero, the first request after idle can be slow; the 5 minute interval keeps it warm as a side effect.
- Sentry: see accounts above, and `docs/security-and-monitoring.md` for the CSP reports and enforcing switch.

## Search Console

Per site, URL-prefix property (not Domain) so the meta tag method works: https://support.google.com/webmasters/answer/9008080. Choose "HTML tag", put the token in `searchConsoleToken` in `src/sites/<site>.ts` (currently `null`), deploy, click Verify. Then submit `https://<site origin>/sitemap.xml` at https://search.google.com/search-console/sitemaps (https://support.google.com/webmasters/answer/7451001). The tag must stay in the page: `src/routes/__root.tsx` renders it as `google-site-verification` on every page once the token is set.

## Rotating secrets

Change the value in the place that holds it, deploy, then revoke the old one. A changed Netlify variable needs a Deploy.

- `BETTER_AUTH_SECRET`: everyone is logged out and pending password and verification links stop working. The job-trigger token follows automatically (it is derived from this secret).
- `PSEUDONYM_SECRET`: moves every person's map pin to a different offset and invalidates open apply forms and contact sender hashes. Avoid unless it leaked.
- Resend API key: create a new key, set it in Netlify, deploy, delete the old key. Webhook secret: rotate on the webhook details page, update `RESEND_WEBHOOK_SECRET`.
- Database password: reset the role password in Neon, update `DATABASE_URL` in Netlify and `DATABASE_URL_UNPOOLED_*` in GitHub, deploy. UNVERIFIED: the exact Neon UI step.
- Netlify build hook: delete the hook, add a new one, update the GitHub secret.
- Backup key: generate a new `age` pair, update `BACKUP_AGE_RECIPIENT`. Keep the old private key as long as old backups exist.
- Turnstile, Google client secret, Cloudflare token, Sentry tokens: create the new credential in the service, update the variable, deploy, delete the old one.

## Monthly credit check (Netlify)

Netlify's Free plan at the time of reading gives 300 credits a month as a hard limit with no top-up: a production deploy costs 15 credits, 1 GB of web bandwidth 20 credits, 1 GB-hour of Functions compute 10 credits (https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/). With two sites and a deploy each Saturday plus a few manual ones, deploys alone are roughly 120 to 150 credits a month. The scheduled functions (a drain every 15 minutes and three daily jobs per site) also use compute; their real monthly cost is UNVERIFIED until a month of production data exists.

Once a month: open Usage and billing, read Credit balance and Credit usage breakdown (https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/monitor-usage-for-credit-based-plans/). Netlify also emails at 50, 75 and 100 percent. If more than half is gone before mid-month, run Deploy manually only for urgent fixes and skip the Saturday run by disabling the Deploy workflow in the Actions tab. That also blocks manual runs until you enable it again, and the monthly keep-alive workflow re-enables it on the 1st, so check on that day.

## Restore drill (before launch and every quarter)

1. Download the latest `backup-<site>-<run id>` artifact from the Backup workflow run (Actions tab). Artifacts are kept 90 days.
2. Decrypt: `age -d -i backup-key.txt <site>-YYYY-MM-DD.dump.age > <site>.dump`.
3. Restore into a scratch target, not production: a throwaway Neon project or the local Docker database (`pnpm db:up`). `pg_restore --no-owner --dbname "<scratch URL>" <site>.dump` with a `pg_restore` at least as new as the dump (Neon: client version must match or exceed the server; use a direct, non-pooled string; https://neon.com/docs/import/migrate-from-postgres). A Neon branch is a copy of its parent, so a branch is not an empty target for a restore.
4. Check: `select count(*)` on `entry`, `"user"`, `change_log` roughly matches production; run `pnpm dev` with `DATABASE_URL` pointing at the scratch database and open `/directory` and `/admin/entries`.
5. Delete the scratch project and the decrypted file. Note the date of the drill.

Restoring production after a real loss: create a new empty Neon project (or reset the damaged one), restore as above, point `DATABASE_URL` and the GitHub secrets at it, run Migrate (a no-op if the dump is current), deploy.

## If Netlify pauses

When credits run out, all projects on the team are paused until the next monthly refresh or an upgrade: no page loads, no forms, no deploys, and visitors see "Site not available". The free plan cannot buy more credits; the options are to wait or to change plan under Usage and billing, Plan details, Change plan (https://docs.netlify.com/manage/accounts-and-billing/billing/resume-paused-projects/). While paused: tell the clients, check that the Backup workflow still runs (it does not depend on Netlify), and do not run Deploy. Email jobs and scheduled functions also stop, so jobs queue up in the `job` table and are processed after the site resumes (the drain picks up everything due).

## Claim emails need the owner's go-ahead

Imported listings can be claimed through a one-time link (`/claim/<token>`, tokens stored as hashes, 30 days, created by `pnpm claims:prepare`). The email that carries the link must not be sent to imported contacts until the project owner says so: the plan is one email plus one reminder about 10 days later, business addresses only, with the Art. 14 notice and a one-click removal. Sending is a deliberate manual step (`--dry-run` previews a batch and always wins over `--confirm`): `pnpm claims:send` refuses to run without `CLAIMS_SENDING_APPROVED=yes`, `--confirm`, a batch of 500 or fewer and a final import source text.

## Everyday tasks

- Approve or reject applications, reports and edits: `/admin`.
- Find listings that need attention: `/admin/entries` filters (not confirmed in 12 months, imported and unclaimed, contact email invalid, not trusted). Row menu and detail page: suspend, reinstate, trusted on or off, transfer owner, merge an outside partner into a real listing, move a pin, change a slug.
- Undo a change: `/admin/changes`.
- Export for reports: `/admin/export` (entries with contact details, and confirmed connections). Treat the entries file as personal data.
- Invite another admin: `/admin/users`.
- Deploy: GitHub, Actions, Deploy, Run workflow, choose the site. It refuses to run unless CI and Migrate succeeded on the current `main` commit.
