import { eq } from "drizzle-orm";

import type { Tx } from "@/db/client.server";
import { reviewItem } from "@/db/schema";
import { decideOpportunity } from "@/features/opportunities/decide-opportunity.server";
import { removeOpportunity } from "@/features/opportunities/remove-opportunity.server";

import type { DecideOutcome, IItemDecision } from "./review-schemas";

type Item = typeof reviewItem.$inferSelect;

// Opportunity errors are left to bubble: the transaction must roll back before the caller reports them.
export async function decideOpportunityItem(
  tx: Tx,
  item: Item,
  { decision, reasonCode, note, adminId }: IItemDecision,
): Promise<DecideOutcome> {
  if (item.entityType !== "opportunity") return "failed";
  await decideOpportunity(tx, {
    id: item.entityId,
    approve: decision === "approve",
    reasonCode,
    note,
    adminId,
  });
  return "ok";
}

// "Approve" on a report means the post is taken down, which needs a reason; "reject" dismisses the report.
export async function decideOpportunityReport(
  tx: Tx,
  item: Item,
  { decision, reasonCode, note, adminId }: IItemDecision,
): Promise<DecideOutcome> {
  if (decision === "reject") {
    await tx
      .update(reviewItem)
      .set({ status: "dismissed", decidedBy: adminId, decidedAt: new Date() })
      .where(eq(reviewItem.id, item.id));
    return "ok";
  }
  if (!reasonCode) return "failed";
  const { emailed } = await removeOpportunity(tx, {
    id: item.entityId,
    reasonCode,
    note,
    adminId,
  });
  return emailed ? "ok" : "no_account";
}
