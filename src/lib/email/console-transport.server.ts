import type { IEmailAdapter } from "./email-adapter";

// Default while there is no Resend key: mail is logged, never delivered.
export const consoleTransport: IEmailAdapter = {
  sendEmail({ to, subject, text, replyTo, idempotencyKey }) {
    console.info(
      [
        "[email:console]",
        `To: ${to}`,
        replyTo ? `Reply-To: ${replyTo}` : null,
        `Subject: ${subject}`,
        idempotencyKey ? `Idempotency-Key: ${idempotencyKey}` : null,
        "",
        text,
      ]
        .filter((line) => line !== null)
        .join("\n"),
    );
    return Promise.resolve();
  },
};
