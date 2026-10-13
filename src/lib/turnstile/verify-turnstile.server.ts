import { env } from "@/env.server";
import { clientIp, UNKNOWN_IP } from "@/server/request.server";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export class TurnstileError extends Error {
  constructor() {
    super("Turnstile check failed");
    this.name = "TurnstileError";
  }
}

async function siteverify(token: string): Promise<boolean> {
  const ip = clientIp();
  const body = new URLSearchParams({
    secret: env.TURNSTILE_SECRET_KEY,
    response: token,
  });
  if (ip !== UNKNOWN_IP) body.set("remoteip", ip);

  const response = await fetch(VERIFY_URL, {
    method: "POST",
    body,
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) return false;
  const result = (await response.json()) as { success?: boolean };
  return result.success === true;
}

// Fails closed: a timeout or an upstream error counts as a failed check the form can retry.
export async function verifyTurnstile(token: string): Promise<void> {
  const passed = await siteverify(token).catch(() => false);
  if (!passed) throw new TurnstileError();
}
