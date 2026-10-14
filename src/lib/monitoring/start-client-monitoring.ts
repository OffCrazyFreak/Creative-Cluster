import type { AnyRouter } from "@tanstack/react-router";

import { capturePageview, loadPostHog } from "../analytics/posthog-client";

const SENTRY_DSN =
  (import.meta.env.VITE_SENTRY_DSN as string | undefined) || undefined;
const POSTHOG_KEY =
  (import.meta.env.VITE_POSTHOG_KEY as string | undefined) || undefined;

async function startSentry(router: AnyRouter, dsn: string): Promise<void> {
  const [Sentry, { sentryBaseOptions }] = await Promise.all([
    import("@sentry/tanstackstart-react"),
    import("./sentry-options"),
  ]);
  Sentry.init({
    ...sentryBaseOptions(dsn),
    integrations: [Sentry.tanstackRouterBrowserTracingIntegration(router)],
  });
}

async function startAll(router: AnyRouter): Promise<void> {
  if (SENTRY_DSN) void startSentry(router, SENTRY_DSN).catch(() => undefined);
  if (!POSTHOG_KEY) return;
  // Subscribe first: events fired while the SDK loads wait in the capture queue.
  router.subscribe("onResolved", ({ pathChanged }) => {
    if (pathChanged) capturePageview();
  });
  capturePageview();
  // A blocked or failed chunk must never break the page.
  await loadPostHog().catch(() => undefined);
}

// Deferred so neither SDK competes with hydration or counts toward the initial bundle.
export function startClientMonitoring(router: AnyRouter): void {
  if (!SENTRY_DSN && !POSTHOG_KEY) return;
  function run() {
    void startAll(router);
  }
  if ("requestIdleCallback" in window) window.requestIdleCallback(run);
  else setTimeout(run, 1);
}
