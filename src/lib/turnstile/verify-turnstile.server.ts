import { env } from "@/env.server";
import { clientIp } from "@/server/request.server";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export class TurnstileError extends Error {
  constructor() {
    super("Turnstile check failed");
    this.name = "TurnstileError";
  }
}

export async function verifyTurnstile(token: string): Promise<void> {
  const response = await fetch(VERIFY_URL, {
    method: "POST",
    body: new URLSearchParams({
      secret: env.TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: clientIp(),
    }),
    signal: AbortSignal.timeout(5000),
  });
  const result = (await response.json()) as { success?: boolean };
  if (!result.success) throw new TurnstileError();
}
