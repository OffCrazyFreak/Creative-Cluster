import { Resend } from "resend";

import { env } from "@/env.server";

import {
  handleBadAddresses,
  type IBadAddressEvent,
} from "./bounce-events.server";

// verify() never calls the API, so the key is a placeholder (the constructor insists on one).
const verifier = new Resend("re_webhook_verify_only");

function respond(status: number, body: string) {
  return new Response(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function badAddresses(
  event: ReturnType<typeof verifier.webhooks.verify>,
): IBadAddressEvent[] {
  switch (event.type) {
    case "email.bounced":
      // A transient bounce (full mailbox) heals itself, so it must not switch the form off.
      if (event.data.bounce.type === "Transient") return [];
      return event.data.to.map((address) => ({
        address,
        reason: `bounce ${event.data.bounce.type}`,
      }));
    case "email.complained":
      return event.data.to.map((address) => ({ address, reason: "complaint" }));
    case "email.suppressed":
      return event.data.to.map((address) => ({
        address,
        reason: "suppressed",
      }));
    case "email.failed":
      // The send failed on our side or the provider's; the address itself is not at fault.
      console.warn("resend email.failed", event.data.email_id);
      return [];
    default:
      return [];
  }
}

export async function handleResendWebhook(request: Request): Promise<Response> {
  const secret = env.RESEND_WEBHOOK_SECRET;
  if (!secret) return respond(503, "webhook not configured");
  const payload = await request.text();
  let event: ReturnType<typeof verifier.webhooks.verify>;
  try {
    event = verifier.webhooks.verify({
      payload,
      headers: {
        id: request.headers.get("svix-id") ?? "",
        timestamp: request.headers.get("svix-timestamp") ?? "",
        signature: request.headers.get("svix-signature") ?? "",
      },
      webhookSecret: secret,
    });
  } catch {
    return respond(400, "invalid signature");
  }
  try {
    await handleBadAddresses(badAddresses(event));
  } catch (error) {
    console.error("resend webhook failed", error);
    // A non-2xx answer makes Resend retry the event.
    return respond(500, "failed");
  }
  return respond(200, "ok");
}
