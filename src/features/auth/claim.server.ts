import { createHash } from "node:crypto";

import { and, eq, gt, isNull, sql } from "drizzle-orm";

import { INVITE_TOKEN_TTL_SECONDS } from "@/constants/email";
import { LOCALES } from "@/constants/locales";
import { db, type DbOrTx } from "@/db/client.server";
import { account, claimInvite, entry, user } from "@/db/schema";
import { writeChange } from "@/lib/change-log/write-change.server";
import { createPasswordToken } from "@/lib/auth/password-token.server";
import { openInviteCondition } from "@/features/claims/claim-state.server";
import { site } from "@/sites";

import { cannotOwnListing } from "./listing-owner-check.server";

export type ClaimResult =
  | { status: "ok"; passwordToken: string | null }
  | { status: "invalid" }
  | { status: "taken" }
  | { status: "refused" };

// Only the hash is stored, so a leaked database cannot be used to claim listings.
export function hashClaimToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function usableInvite(tokenHash: string) {
  return and(
    eq(claimInvite.tokenHash, tokenHash),
    isNull(claimInvite.usedAt),
    gt(claimInvite.expiresAt, sql`now()`),
  );
}

async function userIdByEmail(tx: DbOrTx, email: string) {
  const [row] = await tx
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  return row?.id;
}

async function hasPassword(tx: DbOrTx, userId: string) {
  const [row] = await tx
    .select({ id: account.id })
    .from(account)
    .where(
      and(eq(account.userId, userId), eq(account.providerId, "credential")),
    )
    .limit(1);
  return Boolean(row);
}

export async function getClaimPreview(token: string) {
  const [row] = await db
    .select({ entryName: entry.name, email: claimInvite.email })
    .from(claimInvite)
    .innerJoin(entry, eq(entry.id, claimInvite.entryId))
    .where(and(usableInvite(hashClaimToken(token)), openInviteCondition))
    .limit(1);
  return row ?? null;
}

export async function claimListing(token: string): Promise<ClaimResult> {
  return db.transaction(async (tx) => {
    const [invite] = await tx
      .select()
      .from(claimInvite)
      .where(usableInvite(hashClaimToken(token)))
      .limit(1)
      .for("update");
    if (!invite) return { status: "invalid" };

    const [listing] = await tx
      .select()
      .from(entry)
      .where(eq(entry.id, invite.entryId))
      .limit(1)
      .for("update");
    if (!listing) return { status: "invalid" };
    if (listing.ownerUserId) return { status: "taken" };
    // The link stays usable for its TTL, so the listing must still be live and have the address it was sent to.
    const [open] = await tx
      .select({ id: claimInvite.id })
      .from(claimInvite)
      .innerJoin(entry, eq(entry.id, claimInvite.entryId))
      .where(and(eq(claimInvite.id, invite.id), openInviteCondition))
      .limit(1);
    if (!open) return { status: "invalid" };

    const email = invite.email.toLowerCase();
    const existingId = await userIdByEmail(tx, email);
    const locale = LOCALES.find((l) => l === listing.sourceLocale);
    // A concurrent invite for the same address wins the insert; then we link to that account.
    const [created] = existingId
      ? []
      : await tx
          .insert(user)
          .values({
            email,
            name: listing.contactName ?? listing.name,
            // The emailed claim link proves the address belongs to the owner.
            emailVerified: true,
            locale: locale ?? site.baseLocale,
          })
          .onConflictDoNothing({ target: user.email })
          .returning({ id: user.id });
    const ownerId =
      existingId ?? created?.id ?? (await userIdByEmail(tx, email));
    if (!ownerId) throw new Error("Claim could not resolve the owner account");
    if (await cannotOwnListing(tx, ownerId, listing.id))
      return { status: "refused" };

    await tx
      .update(entry)
      .set({ ownerUserId: ownerId })
      .where(eq(entry.id, listing.id));
    await tx
      .update(claimInvite)
      .set({ usedAt: new Date() })
      .where(eq(claimInvite.id, invite.id));
    await writeChange(tx, {
      entityType: "entry",
      entityId: listing.id,
      userId: ownerId,
      source: "owner",
      action: "update",
      before: { ownerUserId: null },
      after: { ownerUserId: ownerId },
    });

    // An account that already has a password keeps it; one without (new, or invited but never
    // set up) needs the link that lets the owner choose one.
    const passwordToken = (await hasPassword(tx, ownerId))
      ? null
      : await createPasswordToken(tx, ownerId, INVITE_TOKEN_TTL_SECONDS);
    return { status: "ok", passwordToken };
  });
}
