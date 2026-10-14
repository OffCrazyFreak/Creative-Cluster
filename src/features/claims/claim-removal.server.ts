import { and, eq, gt, isNull, sql } from "drizzle-orm";

import { db } from "@/db/client.server";
import { claimInvite, entry } from "@/db/schema";
import { invalidateMapDirectory } from "@/features/directory/map-directory.server";
import { transitionEntry } from "@/features/lifecycle/entry-transitions.server";
import { hashClaimToken } from "@/features/auth/claim.server";
import { NotFoundError } from "@/server/errors";

import { suppressEmail } from "./email-suppression.server";

export type RemovalResult = { status: "ok" } | { status: "invalid" };

function usableInvite(token: string) {
  return and(
    eq(claimInvite.tokenHash, hashClaimToken(token)),
    isNull(claimInvite.usedAt),
    gt(claimInvite.expiresAt, sql`now()`),
  );
}

// Read-only: mail scanners open links, so a plain visit must never remove anything.
export async function getRemovalPreview(token: string) {
  const [row] = await db
    .select({ entryName: entry.name })
    .from(claimInvite)
    .innerJoin(entry, eq(entry.id, claimInvite.entryId))
    .where(and(usableInvite(token), isNull(entry.ownerUserId)))
    .limit(1);
  return row ?? null;
}

// Archives the listing, records the address so nothing more is sent, and retires the invite.
export async function removeListingByToken(
  token: string,
): Promise<RemovalResult> {
  const result = await db.transaction(async (tx): Promise<RemovalResult> => {
    const [invite] = await tx
      .select()
      .from(claimInvite)
      .where(usableInvite(token))
      .limit(1)
      .for("update");
    if (!invite) return { status: "invalid" };
    try {
      await transitionEntry(tx, {
        entryId: invite.entryId,
        from: ["published"],
        to: "archived",
        actor: { userId: null, source: "owner" },
      });
    } catch (error) {
      // Already hidden (archived, suspended): the address is still recorded below.
      if (!(error instanceof NotFoundError)) throw error;
    }
    await suppressEmail(tx, invite.email, "claim_removal");
    await tx
      .update(claimInvite)
      .set({ usedAt: new Date() })
      .where(eq(claimInvite.id, invite.id));
    return { status: "ok" };
  });
  if (result.status === "ok") invalidateMapDirectory();
  return result;
}
