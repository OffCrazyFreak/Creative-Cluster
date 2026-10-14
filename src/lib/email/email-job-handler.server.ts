import {
  EMAIL_TEMPLATE_NAMES,
  type EmailTemplateName,
} from "@/constants/email";
import { eq } from "drizzle-orm";

import { db } from "@/db/client.server";
import { job as jobTable } from "@/db/schema";
import type { IEmailJobPayload } from "@/emails/email-types";
import {
  PermanentJobError,
  type JobHandler,
} from "@/lib/jobs/job-registry.server";

import {
  countSentToday,
  maySend,
  startOfNextUtcDay,
} from "./email-budget.server";
import { renderEmail } from "./render-email";
import { sendEmail } from "./send-email.server";

function isEmailPayload(payload: unknown): payload is IEmailJobPayload {
  if (typeof payload !== "object" || payload === null) return false;
  const { template, to } = payload as Record<string, unknown>;
  return (
    typeof to === "string" &&
    EMAIL_TEMPLATE_NAMES.includes(template as EmailTemplateName)
  );
}

export async function handleEmailJob(
  ...[payload, job]: Parameters<JobHandler>
): ReturnType<JobHandler> {
  if (!isEmailPayload(payload))
    throw new PermanentJobError("Malformed email job payload");
  const now = new Date();
  if (!maySend(job.priority, await countSentToday(now, job.id))) {
    return { deferUntil: startOfNextUtcDay(now) };
  }
  const { react, html, text, subject } = await renderEmail(
    payload.template,
    payload.props,
  );
  await sendEmail({
    to: payload.to,
    subject,
    react,
    html,
    text,
    replyTo: payload.replyTo,
    idempotencyKey: job.idempotencyKey ?? `job:${job.id}`,
  });
  // The address of a deleted account must not stay in the outbox once the last mail is out.
  if (payload.template === "erasure_done")
    await db
      .update(jobTable)
      .set({ payload: { template: payload.template, scrubbed: true } })
      .where(eq(jobTable.id, job.id));
}
