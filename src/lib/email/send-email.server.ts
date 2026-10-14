import { env } from "@/env.server";

import { consoleTransport } from "./console-transport.server";
import type { IEmailAdapter, ISendEmailInput } from "./email-adapter";
import { createResendTransport } from "./resend-transport.server";

function pickAdapter(): IEmailAdapter {
  if (!env.RESEND_API_KEY) return consoleTransport;
  return createResendTransport(env.RESEND_API_KEY, env.EMAIL_FROM);
}

const adapter = pickAdapter();

// The console transport prints reset links into the logs, so it must never stand in for Resend in production.
export function sendEmail(input: ISendEmailInput): Promise<void> {
  if (env.NODE_ENV === "production" && !env.RESEND_API_KEY) {
    return Promise.reject(new Error("RESEND_API_KEY is not set"));
  }
  return adapter.sendEmail(input);
}
