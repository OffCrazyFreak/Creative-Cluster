import { and, eq } from "drizzle-orm";

import type { ReasonCode } from "@/constants/moderation";
import type { Tx } from "@/db/client.server";
import { opportunity, reviewItem } from "@/db/schema";
import { writeChange } from "@/lib/change-log/write-change.server";
import { enqueueEmail } from "@/lib/email/enqueue-email.server";
import { site } from "@/sites";
import { absoluteUrl } from "@/utils/seo-links";

import { OpportunityDecisionError } from "./opportunity-errors";
import { lockOpportunityWithOwner } from "./opportunity-owner.server";

export interface IRemoveOpportunity {
  id: string;
  reasonCode: ReasonCode;
  note?: string | null;
  adminId: string;
}

export interface IRemoveResult {
  // False when the entry has no account to write to; the admin must send the statement another way.
  emailed: boolean;
}

// An admin takes a post down (for example after a report). The owner gets the statement of reasons
// the Digital Services Act requires, including for spam, whenever the entry has an account.
export async function removeOpportunity(
  tx: Tx,
  { id, reasonCode, note, adminId }: IRemoveOpportunity,
): Promise<IRemoveResult> {
  const cleanNote = note?.trim() || null;
  if (reasonCode === "other" && !cleanNote)
    throw new OpportunityDecisionError();
  const { row, owner } = await lockOpportunityWithOwner(tx, id, [
    "pending",
    "published",
    "closed",
  ]);
  const now = new Date();
  await tx
    .update(opportunity)
    .set({ status: "removed", closedReason: reasonCode, closedAt: now })
    .where(eq(opportunity.id, id));
  // The removal settles every open item on the post: a waiting review counts as rejected, a report as acted on.
  const open = and(
    eq(reviewItem.entityType, "opportunity"),
    eq(reviewItem.entityId, id),
    eq(reviewItem.status, "open"),
  );
  const decided = {
    reasonCode,
    noteToApplicant: cleanNote,
    decidedBy: adminId,
    decidedAt: now,
  };
  await tx
    .update(reviewItem)
    .set({ ...decided, status: "rejected" })
    .where(and(open, eq(reviewItem.type, "opportunity")));
  await tx
    .update(reviewItem)
    .set({ ...decided, status: "approved" })
    .where(and(open, eq(reviewItem.type, "report")));
  await writeChange(tx, {
    entityType: "opportunity",
    entityId: id,
    userId: adminId,
    source: "admin",
    action: "status_change",
    before: { status: row.status },
    after: { status: "removed", reasonCode, note: cleanNote },
  });
  if (!owner) return { emailed: false };
  await enqueueEmail(tx, {
    template: "opportunity_removed",
    to: owner.email,
    props: {
      locale: owner.locale,
      opportunityTitle: row.title,
      reasonCode,
      note: cleanNote,
      link: absoluteUrl("/account/opportunities", owner.locale),
    },
    idempotencyKey: `opportunity-removed:${id}`,
    replyTo: site.contactEmail,
  });
  return { emailed: true };
}
