import type { init } from "@sentry/tanstackstart-react";

import { scrubEvent } from "./scrub-event";

type SentryOptions = NonNullable<Parameters<typeof init>[0]>;
type ErrorEvent = Parameters<NonNullable<SentryOptions["beforeSend"]>>[0];
type TransactionEvent = Parameters<
  NonNullable<SentryOptions["beforeSendTransaction"]>
>[0];

// Expected outcomes thrown by guards and services; they are answers, not bugs.
const EXPECTED_ERRORS = new Set([
  "NotFoundError",
  "UnauthorizedError",
  "ForbiddenError",
  "LimitError",
]);

function isExpected(event: ErrorEvent): boolean {
  return (event.exception?.values ?? []).some(
    (v) => v.type !== undefined && EXPECTED_ERRORS.has(v.type),
  );
}

export function sentryBaseOptions(dsn: string) {
  return {
    dsn,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    // Static transactions keep beforeSendTransaction (and so the scrubbing) in effect.
    traceLifecycle: "static" as const,
    beforeSend: (event: ErrorEvent) =>
      isExpected(event) ? null : scrubEvent(event),
    beforeSendTransaction: (event: TransactionEvent) => scrubEvent(event),
  };
}
