import type { ReactElement } from "react";

export interface ISendEmailInput {
  to: string;
  subject: string;
  react: ReactElement;
  // The already rendered form; transports send this so nothing renders twice.
  html: string;
  text: string;
  replyTo?: string;
  idempotencyKey?: string;
}

export interface IEmailAdapter {
  sendEmail(input: ISendEmailInput): Promise<void>;
}
