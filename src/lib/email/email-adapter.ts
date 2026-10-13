import type { ReactElement } from "react";

export interface ISendEmailInput {
  to: string;
  subject: string;
  react: ReactElement;
  text: string;
  replyTo?: string;
  idempotencyKey?: string;
}

export interface IEmailAdapter {
  sendEmail(input: ISendEmailInput): Promise<void>;
}
