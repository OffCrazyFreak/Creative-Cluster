import type { PostHog } from "posthog-js";

import { sanitizeEvent } from "./sanitize-event";

type Props = Record<string, string | number | boolean>;

interface IQueued {
  event: string;
  props?: Props;
}

// Read from import.meta.env directly: env.client.ts is client-only and this file is shared with SSR.
const POSTHOG_KEY =
  (import.meta.env.VITE_POSTHOG_KEY as string | undefined) || undefined;
const MAX_QUEUED = 20;
let client: PostHog | null = null;
let loading = false;
const queue: IQueued[] = [];

export function capturePostHog(event: string, props?: Props): void {
  if (typeof window === "undefined" || !POSTHOG_KEY) return;
  if (client) {
    client.capture(event, props);
    return;
  }
  // Events fired before the deferred load finishes are replayed afterwards.
  if (queue.length < MAX_QUEUED) queue.push({ event, props });
}

export function capturePageview(): void {
  capturePostHog("$pageview");
}

export async function loadPostHog(): Promise<void> {
  const key = POSTHOG_KEY;
  if (!key || client || loading) return;
  loading = true;
  const { default: posthog } = await import("posthog-js");
  posthog.init(key, {
    // Same-origin proxy (netlify.toml) keeps ad blockers and third-party requests out.
    api_host: "/ingest-cc",
    ui_host: "https://eu.posthog.com",
    // No cookie, localStorage or sessionStorage: the server hashes IP, user agent and a daily salt.
    cookieless_mode: "always",
    person_profiles: "never",
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    disable_surveys: true,
    advanced_disable_flags: true,
    // Claim and reset links carry secrets in the URL; they must never reach PostHog.
    before_send: sanitizeEvent,
    capture_dead_clicks: false,
    rageclick: false,
  });
  client = posthog;
  for (const { event, props } of queue.splice(0)) client.capture(event, props);
}
