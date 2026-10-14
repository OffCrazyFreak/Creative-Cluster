import { eq } from "drizzle-orm";

import { OPPORTUNITY_FILLED_REASON } from "@/constants/opportunities";
import { db } from "@/db/client.server";
import { opportunity } from "@/db/schema";
import { writeChange } from "@/lib/change-log/write-change.server";
import { NotFoundError } from "@/server/errors";

import { afterOpportunityChange } from "./opportunity-effects.server";
import { lockOwnOpportunity } from "./own-opportunity-lock.server";

// The page keeps a "Filled" label for a week, so closing is a status change, not a delete.
export async function markOpportunityFilled(id: string, userId: string) {
  await db.transaction(async (tx) => {
    const { row } = await lockOwnOpportunity(tx, id, userId);
    if (row.status !== "published") throw new NotFoundError();
    await tx
      .update(opportunity)
      .set({
        status: "closed",
        closedReason: OPPORTUNITY_FILLED_REASON,
        closedAt: new Date(),
      })
      .where(eq(opportunity.id, id));
    await writeChange(tx, {
      entityType: "opportunity",
      entityId: id,
      userId,
      source: "owner",
      action: "status_change",
      before: { status: "published" },
      after: { status: "closed", closedReason: OPPORTUNITY_FILLED_REASON },
    });
  });
  await afterOpportunityChange();
}
