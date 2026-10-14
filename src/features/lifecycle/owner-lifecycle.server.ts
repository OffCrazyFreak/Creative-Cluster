import { and, asc, eq } from "drizzle-orm";

import { CONSENT_TEXT_VERSION } from "@/constants/apply";
import { db } from "@/db/client.server";
import { entry } from "@/db/schema";
import { invalidateMapDirectory } from "@/features/directory/map-directory.server";
import { writeChange } from "@/lib/change-log/write-change.server";
import { NotFoundError } from "@/server/errors";

import { transitionEntry } from "./entry-transitions.server";
import type { IOwnListingStatus, OwnerActionResult } from "./lifecycle-schemas";

async function ownedEntryId(userId: string): Promise<string> {
  const [row] = await db
    .select({ id: entry.id })
    .from(entry)
    .where(eq(entry.ownerUserId, userId))
    .orderBy(asc(entry.createdAt))
    .limit(1);
  if (!row) throw new NotFoundError();
  return row.id;
}

export async function getOwnListingStatus(
  userId: string,
): Promise<IOwnListingStatus | null> {
  const [row] = await db
    .select()
    .from(entry)
    .where(eq(entry.ownerUserId, userId))
    .orderBy(asc(entry.createdAt))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    kind: row.kind,
    status: row.status,
    suspendedReason: row.status === "suspended" ? row.suspendedReason : null,
    lastConfirmedAt: row.lastConfirmedAt?.toISOString() ?? null,
    hasConsent: row.consentAt !== null,
    erasureRequestedAt: row.erasureRequestedAt?.toISOString() ?? null,
  };
}

// Archive is the owner's reversible "hide my listing"; a suspension or a pending deletion is not theirs to lift.
export async function archiveOwnListing(userId: string) {
  const entryId = await ownedEntryId(userId);
  await db.transaction((tx) =>
    transitionEntry(tx, {
      entryId,
      from: ["published"],
      to: "archived",
      actor: { userId, source: "owner" },
      ownerUserId: userId,
    }),
  );
  invalidateMapDirectory();
}

export async function unarchiveOwnListing(
  userId: string,
  consent: boolean,
): Promise<OwnerActionResult> {
  const entryId = await ownedEntryId(userId);
  try {
    await db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(entry)
        .where(and(eq(entry.id, entryId), eq(entry.ownerUserId, userId)))
        .limit(1)
        .for("update");
      if (!row || row.erasureRequestedAt) throw new NotFoundError();
      // A person who withdrew consent is published again only with fresh consent.
      const needsConsent = row.kind === "person" && !row.consentAt;
      if (needsConsent && !consent) throw new ConsentRequiredError();
      await transitionEntry(tx, {
        entryId,
        from: ["archived"],
        to: "published",
        patch: needsConsent
          ? { consentAt: new Date(), consentVersion: CONSENT_TEXT_VERSION }
          : undefined,
        actor: { userId, source: "owner" },
        ownerUserId: userId,
      });
    });
  } catch (error) {
    if (error instanceof ConsentRequiredError)
      return { status: "consent_required" };
    throw error;
  }
  invalidateMapDirectory();
  return { status: "ok" };
}

// Withdrawal unpublishes at once; the stored consent is cleared so republishing needs a new one.
export async function withdrawOwnConsent(userId: string) {
  const entryId = await ownedEntryId(userId);
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(entry)
      .where(
        and(
          eq(entry.id, entryId),
          eq(entry.ownerUserId, userId),
          eq(entry.kind, "person"),
        ),
      )
      .limit(1)
      .for("update");
    if (!row) throw new NotFoundError();
    if (row.status === "published")
      await transitionEntry(tx, {
        entryId,
        from: ["published"],
        to: "archived",
        patch: { consentAt: null, consentVersion: null },
        actor: { userId, source: "owner" },
        ownerUserId: userId,
      });
    else
      await tx
        .update(entry)
        .set({ consentAt: null, consentVersion: null })
        .where(eq(entry.id, entryId));
    await writeChange(tx, {
      entityType: "entry",
      entityId: entryId,
      userId,
      source: "owner",
      action: "update",
      before: { consent: row.consentVersion },
      after: { consent: null },
    });
  });
  invalidateMapDirectory();
}

export async function confirmOwnListing(userId: string) {
  const entryId = await ownedEntryId(userId);
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ lastConfirmedAt: entry.lastConfirmedAt })
      .from(entry)
      .where(
        and(
          eq(entry.id, entryId),
          eq(entry.ownerUserId, userId),
          eq(entry.status, "published"),
        ),
      )
      .limit(1)
      .for("update");
    if (!row) throw new NotFoundError();
    const now = new Date();
    await tx
      .update(entry)
      .set({ lastConfirmedAt: now })
      .where(eq(entry.id, entryId));
    await writeChange(tx, {
      entityType: "entry",
      entityId: entryId,
      userId,
      source: "owner",
      action: "update",
      before: { lastConfirmedAt: row.lastConfirmedAt?.toISOString() ?? null },
      after: { lastConfirmedAt: now.toISOString() },
    });
  });
}

class ConsentRequiredError extends Error {}
