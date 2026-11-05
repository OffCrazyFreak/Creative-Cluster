import { and, eq, isNull } from "drizzle-orm";

import type { Tx } from "@/db/client.server";
import { entry, opportunity } from "@/db/schema";
import { NotFoundError } from "@/server/errors";

import { lockOwner } from "./opportunity-rules.server";

// Owner first, then the post, as every posting service does, so they queue instead of racing.
export async function lockOwnOpportunity(tx: Tx, id: string, userId: string) {
  await lockOwner(tx, userId);
  const [found] = await tx
    .select({
      row: opportunity,
      entryStatus: entry.status,
      entryTrusted: entry.trusted,
    })
    .from(opportunity)
    .innerJoin(entry, eq(entry.id, opportunity.entryId))
    .where(
      and(
        eq(opportunity.id, id),
        eq(entry.ownerUserId, userId),
        isNull(entry.erasureRequestedAt),
      ),
    )
    .for("update", { of: opportunity });
  if (!found) throw new NotFoundError();
  return found;
}
