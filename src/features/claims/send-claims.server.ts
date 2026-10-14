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

import {
  CLAIM_INVITE_TTL_DAYS,
  CLAIM_REMINDER_AFTER_DAYS,
} from "@/constants/import";
import { db, type Tx } from "@/db/client.server";
import { claimInvite, entry, job } from "@/db/schema";
import { enqueueEmail } from "@/lib/email/enqueue-email.server";
import { site } from "@/sites";

import {
  claimEmailProps,
  claimReminderProps,
} from "./claim-email-props.server";
import { suppressedAmong } from "./email-suppression.server";
import { listUnsentInvites } from "./prepare-claims.server";

export interface ISendResult {
  invites: number;
  reminders: number;
}

// Listing still live, unclaimed and deliverable; re-checked under the row lock because the batch runs for a while.
const stillOpen = and(
  isNull(claimInvite.usedAt),
  eq(entry.status, "published"),
  isNull(entry.ownerUserId),
  isNull(entry.erasureRequestedAt),
  eq(entry.contactEmailInvalid, false),
);

interface IReminderRow {
  inviteId: string;
  email: string;
  expiresAt: Date;
  name: string;
  sourceLocale: string;
}

// One mail per address: a contact of several listings is written to once, the rest wait.
function onePerAddress<T extends { email: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = row.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function addressAlreadyMailed(tx: Tx, email: string) {
  const [row] = await tx
    .select({ id: claimInvite.id })
    .from(claimInvite)
    .where(
      and(
        sql`lower(${claimInvite.email}) = ${email.toLowerCase()}`,
        isNotNull(claimInvite.sentAt),
      ),
    )
    .limit(1);
  return Boolean(row);
}

async function eligibleInvites() {
  const rows = await listUnsentInvites();
  const mailed = await db
    .select({ email: sql<string>`lower(${claimInvite.email})` })
    .from(claimInvite)
    .where(isNotNull(claimInvite.sentAt));
  const done = new Set(mailed.map((row) => row.email));
  return onePerAddress(rows).filter(
    (row) => !done.has(row.email.toLowerCase()),
  );
}

// The first mail restarts the 30 days, so a long wait between prepare and send does not eat into the links.
async function sendInvites(limit: number, importSource: string) {
  let sent = 0;
  for (const invite of (await eligibleInvites()).slice(0, limit)) {
    const queued = await db.transaction(async (tx) => {
      const [locked] = await tx
        .select({ id: claimInvite.id })
        .from(claimInvite)
        .innerJoin(entry, eq(entry.id, claimInvite.entryId))
        .where(
          and(
            eq(claimInvite.id, invite.inviteId),
            isNull(claimInvite.sentAt),
            stillOpen,
          ),
        )
        .for("update", { of: claimInvite });
      if (!locked) return false;
      if ((await suppressedAmong(tx, [invite.email])).size > 0) return false;
      if (await addressAlreadyMailed(tx, invite.email)) return false;
      await tx
        .update(claimInvite)
        .set({
          sentAt: new Date(),
          expiresAt: sql`now() + make_interval(days => ${CLAIM_INVITE_TTL_DAYS})`,
        })
        .where(eq(claimInvite.id, invite.inviteId));
      await enqueueEmail(tx, {
        template: "claim",
        to: invite.email,
        props: claimEmailProps(invite, importSource),
        idempotencyKey: `claim:${invite.inviteId}`,
        replyTo: site.contactEmail,
      });
      return true;
    });
    if (queued) sent += 1;
  }
  return sent;
}

// Due means: first mail queued long enough ago AND actually delivered (its job is done), so a drain backlog
// never produces a reminder for a mail the recipient has not received.
async function dueReminders(): Promise<IReminderRow[]> {
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
        stillOpen,
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
  return rows.filter((row) => !blocked.has(row.email.toLowerCase()));
}

async function sendReminders(limit: number) {
  let sent = 0;
  for (const invite of (await dueReminders()).slice(0, limit)) {
    const queued = await db.transaction(async (tx) => {
      const [locked] = await tx
        .select({ id: claimInvite.id })
        .from(claimInvite)
        .innerJoin(entry, eq(entry.id, claimInvite.entryId))
        .where(
          and(
            eq(claimInvite.id, invite.inviteId),
            isNull(claimInvite.reminderSentAt),
            stillOpen,
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
    if (queued) sent += 1;
  }
  return sent;
}

// Counts for --dry-run: what a run with this batch would queue, without writing anything.
export async function planClaimBatch(batch: number): Promise<ISendResult> {
  const reminders = Math.min((await dueReminders()).length, batch);
  const invites = Math.min((await eligibleInvites()).length, batch - reminders);
  return { invites, reminders };
}

// Reminders come first, then new invites, together capped by the batch; the operator picks it with the daily mail cap in mind.
export async function sendClaimBatch(
  batch: number,
  importSource: string,
): Promise<ISendResult> {
  const reminders = await sendReminders(batch);
  const invites = await sendInvites(batch - reminders, importSource);
  return { invites, reminders };
}
