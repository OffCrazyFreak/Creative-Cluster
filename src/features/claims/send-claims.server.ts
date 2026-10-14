import { and, eq, isNotNull, sql } from "drizzle-orm";

import { db } from "@/db/client.server";
import { claimInvite, job } from "@/db/schema";

import { mailableInvites, sendInvites } from "./send-invites.server";
import { dueReminders, sendReminders } from "./send-reminders.server";

export interface ISendResult {
  invites: number;
  reminders: number;
}

export interface IBatchPlan extends ISendResult {
  // First mails marked sent whose job failed for good: nobody is told, so the dry run shows them.
  failedFirstMails: number;
}

async function countFailedFirstMails(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(claimInvite)
    .innerJoin(job, eq(job.idempotencyKey, sql`'claim:' || ${claimInvite.id}`))
    .where(and(isNotNull(claimInvite.sentAt), eq(job.status, "failed")));
  return row.count;
}

// Counts for --dry-run: what a run with this batch would queue, without writing anything.
export async function planClaimBatch(batch: number): Promise<IBatchPlan> {
  const reminders = Math.min((await dueReminders()).length, batch);
  const invites = Math.min((await mailableInvites()).length, batch - reminders);
  return {
    invites,
    reminders,
    failedFirstMails: await countFailedFirstMails(),
  };
}

// Reminders come first, then new invites, together capped by the batch; pick it with the daily mail cap in mind.
export async function sendClaimBatch(
  batch: number,
  importSource: string,
): Promise<ISendResult> {
  const reminders = await sendReminders(batch);
  const invites = await sendInvites(batch - reminders, importSource);
  return { invites, reminders };
}
