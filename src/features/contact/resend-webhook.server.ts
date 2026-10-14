import { Resend } from "resend";

import { env } from "@/env.server";

import {
  handleBadAddresses,
  type IBadAddressEvent,
} from "./bounce-events.server";

// verify() never calls the API, so the key is a placeholder (the constructor insists on one).
const MAX_BODY_BYTES = 100_000;
const verifier = new Resend("re_webhook_verify_only");

function respond(status: number, body: string) {
  return new Response(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

// "Name <a@b.org>" and stray spaces both occur in provider payloads.
function plainAddress(value: string): string {
  const bracketed = /<([^<>]+)>/.exec(value);
  return (bracketed?.[1] ?? value).trim();
}

// A bounce event does not say which recipient failed, so only single-recipient mail is judged.
// Every mail this app sends has one recipient.
function singleRecipient(to: string[], type: string): string[] {
  if (to.length === 1) return to;
  console.warn("resend event with several recipients ignored", type);
  return [];
}

function badAddresses(
  event: ReturnType<typeof verifier.webhooks.verify>,
): IBadAddressEvent[] {
  switch (event.type) {
    case "email.bounced":
      // A transient bounce (full mailbox) heals itself, so it must not switch the form off.
      if (event.data.bounce.type === "Transient") return [];
      return singleRecipient(event.data.to, event.type).map((address) => ({
        address: plainAddress(address),
        reason: `bounce ${event.data.bounce.type}`,
      }));
    case "email.complained":
      return singleRecipient(event.data.to, event.type).map((address) => ({
        address: plainAddress(address),
        reason: "complaint",
      }));
    case "email.suppressed":
      return singleRecipient(event.data.to, event.type).map((address) => ({
        address: plainAddress(address),
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
  // The signature is the only credential, so refuse early what cannot carry a valid one.
  const length = Number(request.headers.get("content-length") ?? 0);
  if (!request.headers.get("svix-signature") || length > MAX_BODY_BYTES)
    return respond(400, "invalid request");
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
  let found: IBadAddressEvent[];
  try {
    found = badAddresses(event);
  } catch (error) {
    // A signed event of an unexpected shape would fail on every retry, so it is dropped.
    console.error("resend webhook payload not understood", event.type, error);
    return respond(200, "ignored");
  }
  try {
    await handleBadAddresses(found);
  } catch (error) {
    console.error("resend webhook failed", error);
    // A non-2xx answer makes Resend retry the event.
    return respond(500, "failed");
  }
  return respond(200, "ok");
}
