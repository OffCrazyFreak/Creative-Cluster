import { eq } from "drizzle-orm";

import { db } from "@/db/client.server";
import { opportunity } from "@/db/schema";
import { writeChange } from "@/lib/change-log/write-change.server";
import { NotFoundError } from "@/server/errors";

import { afterOpportunityChange } from "./opportunity-effects.server";
import { lockOwnOpportunity } from "./own-opportunity-lock.server";

export const FILLED_REASON = "filled";

// The page keeps a "Filled" label for a week, so closing is a status change, not a delete.
export async function markOpportunityFilled(id: string, userId: string) {
  await db.transaction(async (tx) => {
    const { row } = await lockOwnOpportunity(tx, id, userId);
    if (row.status !== "published") throw new NotFoundError();
    await tx
      .update(opportunity)
      .set({
        status: "closed",
        closedReason: FILLED_REASON,
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
      after: { status: "closed", closedReason: FILLED_REASON },
    });
  });
  await afterOpportunityChange();
}
