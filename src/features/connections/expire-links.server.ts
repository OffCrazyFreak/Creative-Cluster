import { and, eq, lt } from "drizzle-orm";

import { LINK_LIMITS } from "@/constants/links";
import type { DbOrTx } from "@/db/client.server";
import { link } from "@/db/schema";
import { writeChange } from "@/lib/change-log/write-change.server";

import { daysAgo } from "./link-conditions.server";

// Daily job and propose both call this; "system" marks the change as nobody's decision.
export async function withdrawStaleProposals(tx: DbOrTx): Promise<number> {
  const rows = await tx
    .update(link)
    .set({ status: "withdrawn", decidedAt: new Date() })
    .where(
      and(
        eq(link.status, "proposed"),
        lt(link.createdAt, daysAgo(LINK_LIMITS.autoWithdrawDays)),
      ),
    )
    .returning({ id: link.id });
  for (const { id } of rows) {
    await writeChange(tx, {
      entityType: "link",
      entityId: id,
      userId: null,
      source: "system",
      action: "status_change",
      before: { status: "proposed" },
      after: { status: "withdrawn" },
    });
  }
  return rows.length;
}
