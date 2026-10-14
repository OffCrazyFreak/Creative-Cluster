import { and, eq } from "drizzle-orm";

import type { ReasonCode } from "@/constants/moderation";
import type { Tx } from "@/db/client.server";
import { opportunity, reviewItem } from "@/db/schema";
import { writeChange } from "@/lib/change-log/write-change.server";
import { enqueueEmail } from "@/lib/email/enqueue-email.server";
import { absoluteUrl } from "@/utils/seo-links";

import { OpportunityDecisionError } from "./opportunity-errors";
import { lockOpportunityWithOwner } from "./opportunity-owner.server";

export interface IRemoveOpportunity {
  id: string;
  reasonCode: ReasonCode;
  note?: string | null;
  adminId: string;
}

// An admin takes a live post down (for example after a report). The owner always gets the
// statement of reasons, including for spam, because the Digital Services Act requires it.
export async function removeOpportunity(
  tx: Tx,
  { id, reasonCode, note, adminId }: IRemoveOpportunity,
) {
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
  // Reports on this post are settled by the removal.
  await tx
    .update(reviewItem)
    .set({ status: "approved", decidedBy: adminId, decidedAt: now })
    .where(
      and(
        eq(reviewItem.entityType, "opportunity"),
        eq(reviewItem.entityId, id),
        eq(reviewItem.status, "open"),
      ),
    );
  await writeChange(tx, {
    entityType: "opportunity",
    entityId: id,
    userId: adminId,
    source: "admin",
    action: "status_change",
    before: { status: row.status },
    after: { status: "removed", reasonCode, note: cleanNote },
  });
  if (owner)
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
    });
}
