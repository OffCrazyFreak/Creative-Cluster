import { and, eq, isNull, ne } from "drizzle-orm";

import { db } from "@/db/client.server";
import { entry, user } from "@/db/schema";
import { writeChange } from "@/lib/change-log/write-change.server";

import type { OpResult, TransferError } from "./admin-entries-schemas";

// One account owns at most one listing (the account area shows a single one), and a blocked account could not
// use it, so both are refused. No mail goes out: none of the 22 templates describes an ownership change.
export async function transferOwner(
  entryId: string,
  newOwnerId: string,
  adminId: string,
): Promise<OpResult<TransferError>> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ owner: entry.ownerUserId, kind: entry.kind })
      .from(entry)
      .where(eq(entry.id, entryId))
      .limit(1)
      .for("update");
    if (!row || row.kind === "outside_partner")
      return { ok: false, error: "not_found" };
    // Locking the account row serializes two transfers to the same account, so it cannot end up with two listings.
    const [target] = await tx
      .select({ id: user.id, banned: user.banned })
      .from(user)
      .where(eq(user.id, newOwnerId))
      .limit(1)
      .for("update");
    if (!target) return { ok: false, error: "not_found" };
    if (target.banned) return { ok: false, error: "blocked" };
    if (row.owner === newOwnerId) return { ok: true };
    const [other] = await tx
      .select({ id: entry.id })
      .from(entry)
      .where(
        and(
          eq(entry.ownerUserId, newOwnerId),
          ne(entry.id, entryId),
          isNull(entry.erasureRequestedAt),
        ),
      )
      .limit(1);
    if (other) return { ok: false, error: "owner_has_entry" };

    await tx
      .update(entry)
      .set({ ownerUserId: newOwnerId })
      .where(eq(entry.id, entryId));
    await writeChange(tx, {
      entityType: "entry",
      entityId: entryId,
      userId: adminId,
      source: "admin",
      action: "update",
      before: { ownerUserId: row.owner },
      after: { ownerUserId: newOwnerId },
    });
    return { ok: true };
  });
}
