import { env } from "@/env.server";

import { consoleTransport } from "./console-transport.server";
import type { IEmailAdapter } from "./email-adapter";
import { createResendTransport } from "./resend-transport.server";

function pickAdapter(): IEmailAdapter {
  if (!env.RESEND_API_KEY) return consoleTransport;
  return createResendTransport(env.RESEND_API_KEY, env.EMAIL_FROM);
}

export const emailAdapter = pickAdapter();

export const sendEmail = emailAdapter.sendEmail.bind(emailAdapter);
