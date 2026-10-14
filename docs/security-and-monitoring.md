# Security headers, analytics and error monitoring

## Content-Security-Policy

- Policy and nonce: `src/server/csp.server.ts`. The server entry (`src/server.ts`) makes a fresh nonce per request, sets it on the request as `x-csp-nonce` (overwriting anything the client sent), and adds the policy header to HTML responses only.
- The router reads the nonce in `src/router.tsx` (`ssr.nonce`), so TanStack's own inline tags carry it. `script-src` is `'nonce-...' 'strict-dynamic'`, so the nonced bundle may load its own chunks, PostHog and Turnstile.
- Why a header nonce and not a meta tag or hashes: TanStack Start's inline hydration script holds per-request data, so hashes cannot work, and a meta tag cannot be Report-Only or carry `frame-ancestors`. Router issue 8550 (duplicate inline scripts after hydration when the nonce arrives as a header) is open, but it only affects inline `<script>` entries that have children in route `head`; this app has none, and the framework's own inline scripts remove themselves. Checked in a browser: zero inline `<script>` elements remain after hydration.
- `style-src` allows `'unsafe-inline'`: Sonner injects an un-nonced `<style>` element, and Base UI and MapLibre set style attributes.
- Allowed: self, OpenFreeMap (tiles, sprites, glyphs), Cloudinary (images, upload API), Cloudflare Turnstile (script via strict-dynamic, frame, connect), Sentry ingest, Google sign-in as form target. PostHog goes through `/ingest-cc` on self.
- Reports: when `SENTRY_DSN` is set the policy carries `report-uri` to the project's Sentry security endpoint, so violations show up in Sentry.

### Switch to enforcing (after two weeks)

1. In Sentry, filter the CSP issues for both projects. For every legitimate violation, add the source in `buildCsp`, ship, and wait another few days.
2. When two weeks pass without new legitimate violations, set `CSP_MODE=enforce` in the Netlify environment of each site and run the Deploy action. The header name changes from `Content-Security-Policy-Report-Only` to `Content-Security-Policy`.
3. Roll back by setting `CSP_MODE=report-only` and redeploying.

Browser extensions cause some reports (blocked or injected scripts); ignore reports whose blocked URI is `chrome-extension:` or `moz-extension:`.

## PostHog (cookieless)

`src/lib/analytics/`. Loaded by dynamic import after hydration (idle callback) and only when `VITE_POSTHOG_KEY` is set at build time. `track(event, props)` is the only call other areas make. Pageviews fire on path changes through the router, not on filter changes.

## Sentry

`@sentry/tanstackstart-react`, pinned. Client and server start only when `VITE_SENTRY_DSN` and `SENTRY_DSN` are set. Both use `sendDefaultPii: false`, `tracesSampleRate: 0.1`, no replay and the scrubbing in `src/lib/monitoring/scrub-event.ts`. Expected domain errors (not found, unauthorized, forbidden, limit) are dropped. Source maps upload only when `SENTRY_AUTH_TOKEN` (plus `SENTRY_ORG` and `SENTRY_PROJECT`) is set at build time.
