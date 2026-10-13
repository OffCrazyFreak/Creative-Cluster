import { Resend } from "resend";

import type { IEmailAdapter } from "./email-adapter";

export function createResendTransport(
  apiKey: string,
  from: string,
): IEmailAdapter {
  const client = new Resend(apiKey);
  return {
    async sendEmail({ to, subject, html, text, replyTo, idempotencyKey }) {
      const { error } = await client.emails.send(
        { from, to, subject, html, text, replyTo },
        { idempotencyKey },
      );
      if (error) throw new Error(`Resend: ${error.name}: ${error.message}`);
    },
  };
}
