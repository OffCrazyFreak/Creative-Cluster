import { and, asc, eq, gt, isNotNull, isNull, lte, sql } from "drizzle-orm";

import {
  CLAIM_INVITE_TTL_DAYS,
  CLAIM_REMINDER_AFTER_DAYS,
} from "@/constants/import";
import { db } from "@/db/client.server";
import { claimInvite, entry } from "@/db/schema";
import { enqueueEmail } from "@/lib/email/enqueue-email.server";
import { site } from "@/sites";

import { claimEmailLocale, claimEmailProps } from "./claim-email-props.server";
import { claimTokenFor } from "./claim-token.server";
import { isSuppressed } from "./email-suppression.server";
import { listUnsentInvites } from "./prepare-claims.server";

export interface ISendResult {
  invites: number;
  reminders: number;
}

const stillOpen = and(
  isNull(claimInvite.usedAt),
  eq(entry.status, "published"),
  isNull(entry.ownerUserId),
);

// The first mail restarts the 30 days, so a long wait between prepare and send does not eat into the links.
async function sendInvites(limit: number, importSource: string) {
  let sent = 0;
  for (const invite of (await listUnsentInvites()).slice(0, limit)) {
    const queued = await db.transaction(async (tx) => {
      if (await isSuppressed(tx, invite.email)) return false;
      const [locked] = await tx
        .update(claimInvite)
        .set({
          sentAt: new Date(),
          expiresAt: sql`now() + make_interval(days => ${CLAIM_INVITE_TTL_DAYS})`,
        })
        .where(
          and(eq(claimInvite.id, invite.inviteId), isNull(claimInvite.sentAt)),
        )
        .returning({ id: claimInvite.id });
      if (!locked) return false;
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

async function sendReminders(limit: number) {
  const due = await db
    .select({
      inviteId: claimInvite.id,
      email: claimInvite.email,
      expiresAt: claimInvite.expiresAt,
      name: entry.name,
      sourceLocale: entry.sourceLocale,
      importedAt: entry.importedAt,
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
      ),
    )
    .orderBy(asc(claimInvite.sentAt))
    .limit(limit);
  let sent = 0;
  for (const invite of due) {
    const queued = await db.transaction(async (tx) => {
      if (await isSuppressed(tx, invite.email)) return false;
      const [locked] = await tx
        .update(claimInvite)
        .set({ reminderSentAt: new Date() })
        .where(
          and(
            eq(claimInvite.id, invite.inviteId),
            isNull(claimInvite.reminderSentAt),
            isNull(claimInvite.usedAt),
          ),
        )
        .returning({ id: claimInvite.id });
      if (!locked) return false;
      const locale = claimEmailLocale(invite.sourceLocale);
      const link = `${site.origin}/claim/${claimTokenFor(invite.inviteId)}`;
      await enqueueEmail(tx, {
        template: "claim_reminder",
        to: invite.email,
        props: {
          locale,
          entryName: invite.name,
          link,
          removeLink: `${link}/remove`,
          expiryDate: new Intl.DateTimeFormat(locale, {
            dateStyle: "long",
          }).format(invite.expiresAt),
        },
        idempotencyKey: `claim-reminder:${invite.inviteId}`,
        replyTo: site.contactEmail,
      });
      return true;
    });
    if (queued) sent += 1;
  }
  return sent;
}

// Reminders come first, then new invites, together capped by the batch so the daily mail budget is respected.
export async function sendClaimBatch(
  batch: number,
  importSource: string,
): Promise<ISendResult> {
  const reminders = await sendReminders(batch);
  const invites = await sendInvites(batch - reminders, importSource);
  return { invites, reminders };
}
