import { createCsrfMiddleware, createStart } from "@tanstack/react-start";

import "@/lib/zod/zod-locale";
import {
  sentryFunctionMiddleware,
  sentryRequestMiddleware,
} from "@/server/sentry-middleware";

const csrfMiddleware = createCsrfMiddleware({
  filter: (context) => context.handlerType === "serverFn",
});

// CSRF stays first so forged requests are rejected before anything else; without a Sentry DSN capture is a no-op.
export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware, sentryRequestMiddleware],
  functionMiddleware: [sentryFunctionMiddleware],
}));
