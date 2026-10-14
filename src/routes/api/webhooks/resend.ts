import { createFileRoute } from "@tanstack/react-router";

import { handleResendWebhook } from "@/features/contact/resend-webhook.server";

// Not a server function: Resend posts it, and the Svix signature is the only credential.
export const Route = createFileRoute("/api/webhooks/resend")({
  server: {
    handlers: {
      GET: () =>
        new Response(null, { status: 405, headers: { Allow: "POST" } }),
      POST: ({ request }) => handleResendWebhook(request),
    },
  },
});
