import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db/client.server";
import { claimInvite, entry } from "@/db/schema";
import { hashClaimToken, usableInvite } from "@/features/auth/claim.server";
import { invalidateMapDirectory } from "@/features/directory/map-directory.server";
import { transitionEntry } from "@/features/lifecycle/entry-transitions.server";
import { NotFoundError } from "@/server/errors";

import { suppressEmail } from "./email-suppression.server";

export type RemovalResult = { status: "ok" } | { status: "invalid" };

// Read-only: mail scanners open links, so a plain visit must never remove anything.
export async function getRemovalPreview(token: string) {
  const [row] = await db
    .select({ entryName: entry.name })
    .from(claimInvite)
    .innerJoin(entry, eq(entry.id, claimInvite.entryId))
    .where(and(usableInvite(hashClaimToken(token)), isNull(entry.ownerUserId)))
    .limit(1);
  return row ?? null;
}

// Archives the listing, records the address so nothing more is sent, and retires the invites that are not out yet.
export async function removeListingByToken(
  token: string,
): Promise<RemovalResult> {
  const result = await db.transaction(async (tx): Promise<RemovalResult> => {
    const [invite] = await tx
      .select()
      .from(claimInvite)
      .where(usableInvite(hashClaimToken(token)))
      .limit(1)
      .for("update");
    if (!invite) return { status: "invalid" };
    // A claimed listing belongs to its owner: a stale invite must not archive it.
    const [listing] = await tx
      .select({ id: entry.id })
      .from(entry)
      .where(and(eq(entry.id, invite.entryId), isNull(entry.ownerUserId)))
      .limit(1)
      .for("update");
    if (!listing) return { status: "invalid" };
    try {
      await transitionEntry(tx, {
        entryId: invite.entryId,
        from: ["published", "pending", "draft"],
        to: "archived",
        actor: { userId: null, source: "owner" },
      });
    } catch (error) {
      // Archived, suspended or rejected already means hidden: the address is still recorded below.
      if (!(error instanceof NotFoundError)) throw error;
    }
    await suppressEmail(tx, invite.email, "claim_removal");
    const now = new Date();
    await tx
      .update(claimInvite)
      .set({ usedAt: now })
      .where(eq(claimInvite.id, invite.id));
    // Other listings of the same contact: nothing has been mailed for them yet, so nothing should be.
    await tx
      .update(claimInvite)
      .set({ usedAt: now })
      .where(
        and(
          sql`lower(${claimInvite.email}) = ${invite.email.toLowerCase()}`,
          isNull(claimInvite.usedAt),
          isNull(claimInvite.sentAt),
        ),
      );
    return { status: "ok" };
  });
  if (result.status === "ok") invalidateMapDirectory();
  return result;
}
