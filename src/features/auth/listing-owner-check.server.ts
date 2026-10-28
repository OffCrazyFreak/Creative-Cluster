import { and, eq, isNull, ne } from "drizzle-orm";

import type { DbOrTx } from "@/db/client.server";
import { entry, user } from "@/db/schema";

// Same rule as transfer-owner: one listing per account, none for a blocked one. Locking the account row
// serialises two claims or approvals for the same address, so it cannot end up with two listings.
export async function cannotOwnListing(
  tx: DbOrTx,
  userId: string,
  entryId: string,
): Promise<boolean> {
  const [account] = await tx
    .select({ banned: user.banned })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)
    .for("update");
  if (!account || account.banned) return true;
  const [other] = await tx
    .select({ id: entry.id })
    .from(entry)
    .where(
      and(
        eq(entry.ownerUserId, userId),
        ne(entry.id, entryId),
        isNull(entry.erasureRequestedAt),
      ),
    )
    .limit(1);
  return Boolean(other);
}
