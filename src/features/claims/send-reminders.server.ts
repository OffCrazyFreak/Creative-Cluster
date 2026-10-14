import {
  and,
  asc,
  eq,
  exists,
  gt,
  isNotNull,
  isNull,
  lte,
  sql,
} from "drizzle-orm";

import { CLAIM_REMINDER_AFTER_DAYS } from "@/constants/import";
import { db } from "@/db/client.server";
import { claimInvite, entry, job } from "@/db/schema";
import { enqueueEmail } from "@/lib/email/enqueue-email.server";
import { site } from "@/sites";

import { claimReminderProps } from "./claim-email-props.server";
import { openInviteCondition } from "./claim-state.server";
import { suppressedAmong } from "./email-suppression.server";

interface IReminderRow {
  inviteId: string;
  email: string;
  expiresAt: Date;
  name: string;
  sourceLocale: string;
}

// Due means: first mail queued long enough ago AND actually delivered (its job is done), so a drain backlog
// never produces a reminder for a mail the recipient has not received.
export async function dueReminders(): Promise<IReminderRow[]> {
  const rows = await db
    .select({
      inviteId: claimInvite.id,
      email: claimInvite.email,
      expiresAt: claimInvite.expiresAt,
      name: entry.name,
      sourceLocale: entry.sourceLocale,
    })
    .from(claimInvite)
    .innerJoin(entry, eq(entry.id, claimInvite.entryId))
    .where(
      and(
        openInviteCondition,
        isNotNull(claimInvite.sentAt),
        isNull(claimInvite.reminderSentAt),
        gt(claimInvite.expiresAt, sql`now()`),
        lte(
          claimInvite.sentAt,
          sql`now() - make_interval(days => ${CLAIM_REMINDER_AFTER_DAYS})`,
        ),
        exists(
          db
            .select({ one: sql`1` })
            .from(job)
            .where(
              and(
                eq(job.idempotencyKey, sql`'claim:' || ${claimInvite.id}`),
                eq(job.status, "done"),
              ),
            ),
        ),
      ),
    )
    .orderBy(asc(claimInvite.sentAt));
  const blocked = await suppressedAmong(
    db,
    rows.map((row) => row.email),
  );
  return rows.filter((row) => !blocked.has(row.email));
}

async function queueReminder(invite: IReminderRow) {
  return db.transaction(async (tx) => {
    const [locked] = await tx
      .select({ id: claimInvite.id })
      .from(claimInvite)
      .innerJoin(entry, eq(entry.id, claimInvite.entryId))
      .where(
        and(
          eq(claimInvite.id, invite.inviteId),
          isNull(claimInvite.reminderSentAt),
          openInviteCondition,
        ),
      )
      .for("update", { of: claimInvite });
    if (!locked) return false;
    if ((await suppressedAmong(tx, [invite.email])).size > 0) return false;
    await tx
      .update(claimInvite)
      .set({ reminderSentAt: new Date() })
      .where(eq(claimInvite.id, invite.inviteId));
    await enqueueEmail(tx, {
      template: "claim_reminder",
      to: invite.email,
      props: claimReminderProps(invite, invite.expiresAt),
      idempotencyKey: `claim-reminder:${invite.inviteId}`,
      replyTo: site.contactEmail,
    });
    return true;
  });
}

export async function sendReminders(limit: number) {
  let sent = 0;
  for (const invite of await dueReminders()) {
    if (sent >= limit) break;
    if (await queueReminder(invite)) sent += 1;
  }
  return sent;
}
