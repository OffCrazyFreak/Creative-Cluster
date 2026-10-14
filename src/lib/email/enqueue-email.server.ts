import {
  EMAIL_PRIORITY,
  EMAIL_TEMPLATE_PRIORITY,
  type EmailTemplateName,
} from "@/constants/email";
import type { DbOrTx } from "@/db/client.server";
import type { EmailPropsOf, IEmailJobPayload } from "@/emails/email-types";
import { enqueueJob } from "@/lib/jobs/enqueue-job.server";

export interface IEnqueueEmail<T extends EmailTemplateName> {
  template: T;
  to: string;
  props: EmailPropsOf<T>;
  idempotencyKey: string;
  replyTo?: string;
}

// Call inside the transaction that caused the mail, so the mail exists exactly when the change does.
export async function enqueueEmail<T extends EmailTemplateName>(
  tx: DbOrTx,
  input: IEnqueueEmail<T>,
) {
  const payload: IEmailJobPayload<T> = {
    template: input.template,
    to: input.to,
    props: input.props,
    replyTo: input.replyTo,
  };
  await enqueueJob(tx, {
    type: "email",
    payload: { ...payload },
    idempotencyKey: input.idempotencyKey,
    priority: EMAIL_PRIORITY[EMAIL_TEMPLATE_PRIORITY[input.template]],
  });
}
