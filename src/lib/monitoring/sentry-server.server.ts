import * as Sentry from "@sentry/tanstackstart-react";

import { env } from "@/env.server";

import { sentryBaseOptions } from "./sentry-options";

let started = false;

export function initSentryServer(): void {
  if (started || !env.SENTRY_DSN) return;
  started = true;
  Sentry.init(sentryBaseOptions(env.SENTRY_DSN));
}
