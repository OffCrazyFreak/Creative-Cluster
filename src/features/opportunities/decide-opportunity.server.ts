import { and, eq } from "drizzle-orm";

import type { ReasonCode } from "@/constants/moderation";
import type { Tx } from "@/db/client.server";
import { opportunity, reviewItem } from "@/db/schema";
import { writeChange } from "@/lib/change-log/write-change.server";
import { enqueueEmail } from "@/lib/email/enqueue-email.server";
import { enqueueTranslation } from "@/lib/translation/enqueue-translation.server";
import { site } from "@/sites";
import { formatDate } from "@/utils/format-date";
import { absoluteUrl } from "@/utils/seo-links";

import {
  OpportunityDecisionError,
  OpportunityDeadlinePassedError,
} from "./opportunity-errors";
import { periodEnd } from "./opportunity-expiry";
import { lockOpportunityWithOwner } from "./opportunity-owner.server";

export interface IDecideOpportunity {
  // The opportunity id, which is the review item's entityId.
  id: string;
  approve: boolean;
  reasonCode?: ReasonCode;
  note?: string | null;
  adminId: string;
}

export type OpportunityDecision = "published" | "rejected";

function openItems(id: string) {
  return and(
    eq(reviewItem.type, "opportunity"),
    eq(reviewItem.entityType, "opportunity"),
    eq(reviewItem.entityId, id),
    eq(reviewItem.status, "open"),
  );
}

// Runs inside the caller's transaction. After it commits, call afterOpportunityChange().
export async function decideOpportunity(
  tx: Tx,
  { id, approve, reasonCode, note, adminId }: IDecideOpportunity,
): Promise<OpportunityDecision> {
  const cleanNote = note?.trim() || null;
  if (!approve && (!reasonCode || (reasonCode === "other" && !cleanNote)))
    throw new OpportunityDecisionError();

  const { row, entryName, entryTrusted, owner } =
    await lockOpportunityWithOwner(tx, id, ["pending"]);
  const now = new Date();
  const items = await tx
    .select({ id: reviewItem.id })
    .from(reviewItem)
    .where(openItems(id));
  const itemKey = items[0]?.id ?? now.getTime();

  await tx
    .update(reviewItem)
    .set({
      status: approve ? "approved" : "rejected",
      reasonCode: approve ? null : reasonCode,
      noteToApplicant: approve ? null : cleanNote,
      decidedBy: adminId,
      decidedAt: now,
    })
    .where(openItems(id));

  if (approve) {
    const expiresAt = periodEnd({ start: now, deadline: row.deadline });
    // A post whose deadline passed while it waited would be published already expired: reject it instead.
    if (expiresAt <= now) throw new OpportunityDeadlinePassedError();
    await tx
      .update(opportunity)
      .set({ status: "published", publishedAt: now, expiresAt })
      .where(eq(opportunity.id, id));
    await writeChange(tx, {
      entityType: "opportunity",
      entityId: id,
      userId: adminId,
      source: "admin",
      action: "status_change",
      before: { status: "pending" },
      after: { status: "published" },
    });
    await enqueueTranslation(tx, { entityType: "opportunity", entityId: id });
    if (owner)
      await enqueueEmail(tx, {
        template: "opportunity_approved",
        to: owner.email,
        props: {
          locale: owner.locale,
          entryName,
          opportunityTitle: row.title,
          // The stored end is the start of the day after the last open day.
          expiresAt: formatDate(
            new Date(expiresAt.getTime() - 1),
            owner.locale,
          ),
          publishedAtOnce: entryTrusted,
          link: absoluteUrl(`/opportunities/${id}`, owner.locale),
        },
        idempotencyKey: `opportunity-approved:${id}:${itemKey}`,
      });
    return "published";
  }

  await tx
    .update(opportunity)
    .set({ status: "rejected" })
    .where(eq(opportunity.id, id));
  await writeChange(tx, {
    entityType: "opportunity",
    entityId: id,
    userId: adminId,
    source: "admin",
    action: "status_change",
    before: { status: "pending" },
    after: { status: "rejected", reasonCode: reasonCode ?? null },
  });
  // Spam gets no mail, so a spammer learns nothing about what was caught.
  if (owner && reasonCode && reasonCode !== "spam")
    await enqueueEmail(tx, {
      template: "opportunity_rejected",
      to: owner.email,
      props: {
        locale: owner.locale,
        entryName,
        opportunityTitle: row.title,
        reasonCode,
        note: cleanNote,
        link: absoluteUrl("/account/opportunities", owner.locale),
      },
      idempotencyKey: `opportunity-rejected:${id}:${itemKey}`,
      replyTo: site.contactEmail,
    });
  return "rejected";
}
