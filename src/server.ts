import { wrapFetchWithSentry } from "@sentry/tanstackstart-react";
import handler from "@tanstack/react-start/server-entry";

import { env } from "@/env.server";
import { NONCE_HEADER } from "@/lib/csp/nonce-header";
import { initSentryServer } from "@/lib/monitoring/sentry-server.server";
import { paraglideMiddleware } from "@/paraglide/server";
import {
  buildCsp,
  createNonce,
  cspHeaderName,
  sentryReportUri,
} from "@/server/csp.server";
import { withSecurityHeaders } from "@/server/security-headers";

initSentryServer();

// The nonce differs per request, so the policy cannot live in the static header record.
function cspHeaders(response: Response, nonce: string): Record<string, string> {
  if (!response.headers.get("content-type")?.startsWith("text/html")) return {};
  return {
    [cspHeaderName(env.CSP_MODE)]: buildCsp({
      nonce,
      reportUri: sentryReportUri(env.SENTRY_DSN),
    }),
  };
}

export default wrapFetchWithSentry({
  async fetch(request: Request): Promise<Response> {
    const nonce = createNonce();
    // Overwritten, never trusted from the client; the router reads it to nonce its inline tags.
    request.headers.set(NONCE_HEADER, nonce);
    // The router rewrites localized URLs itself, so the original request goes on.
    const response = await paraglideMiddleware(request, () =>
      handler.fetch(request),
    );
    return withSecurityHeaders(response, cspHeaders(response, nonce));
  },
});
