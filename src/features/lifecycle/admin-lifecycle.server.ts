import { eq } from "drizzle-orm";

import { db, type Tx } from "@/db/client.server";
import { entry, user } from "@/db/schema";
import { invalidateMapDirectory } from "@/features/directory/map-directory.server";
import { pageLink, recipientLocale } from "@/lib/auth/auth-email.server";
import { writeChange } from "@/lib/change-log/write-change.server";
import { enqueueEmail } from "@/lib/email/enqueue-email.server";
import { NotFoundError } from "@/server/errors";

import { transitionEntry, type IActor } from "./entry-transitions.server";

// A listing queued for deletion stays hidden until the owner cancels, and a person who withdrew consent stays
// unpublished until they give it again.
async function assertCanPublish(
  tx: Tx,
  entryId: string,
  requireConsent = true,
) {
  const [row] = await tx
    .select({
      erasure: entry.erasureRequestedAt,
      kind: entry.kind,
      consentAt: entry.consentAt,
      importedAt: entry.importedAt,
    })
    .from(entry)
    .where(eq(entry.id, entryId))
    .limit(1)
    .for("update");
  if (!row || row.erasure) throw new NotFoundError();
  if (requireConsent && row.kind === "person" && !row.consentAt)
    throw new NotFoundError();
  return row;
}

function admin(adminId: string): IActor {
  return { userId: adminId, source: "admin" };
}

async function mailSuspension(
  tx: Tx,
  row: typeof entry.$inferSelect,
  reason: string,
) {
  if (!row.ownerUserId) return;
  const [owner] = await tx
    .select({ email: user.email, locale: user.locale })
    .from(user)
    .where(eq(user.id, row.ownerUserId))
    .limit(1);
  if (!owner) return;
  const locale = recipientLocale(owner);
  await enqueueEmail(tx, {
    template: "suspended",
    to: owner.email,
    props: {
      locale,
      entryName: row.name,
      reason,
      link: pageLink("/account", locale),
    },
    idempotencyKey: `suspended:${row.id}:${row.updatedAt.getTime()}`,
  });
}

// Entry, posts and connections vanish from every public query at once because they all go through publicEntryCondition.
export async function suspendEntry(
  entryId: string,
  reason: string,
  adminId: string,
) {
  await db.transaction(async (tx) => {
    const row = await transitionEntry(tx, {
      entryId,
      from: ["published"],
      to: "suspended",
      patch: { suspendedReason: reason },
      actor: admin(adminId),
    });
    await mailSuspension(tx, row, reason);
  });
  invalidateMapDirectory();
}

export async function reinstateEntry(entryId: string, adminId: string) {
  await db.transaction(async (tx) => {
    const current = await assertCanPublish(tx, entryId, false);
    // A person who withdrew consent while suspended cannot go public again; the listing lands in the archive,
    // where the owner can show it again with fresh consent.
    const needsConsent = current.kind === "person" && !current.consentAt;
    await transitionEntry(tx, {
      entryId,
      from: ["suspended"],
      to: needsConsent ? "archived" : "published",
      patch: { suspendedReason: null },
      actor: admin(adminId),
    });
  });
  invalidateMapDirectory();
}

export async function archiveEntryAsAdmin(entryId: string, adminId: string) {
  await db.transaction((tx) =>
    transitionEntry(tx, {
      entryId,
      // A suspension is lifted by reinstating, never by archiving: an archive the owner can undo would lift it.
      from: ["published"],
      to: "archived",
      actor: admin(adminId),
    }),
  );
  invalidateMapDirectory();
}

// Restores an archived listing (for example an unclaimed import the 12 month check archived).
export async function restoreEntryAsAdmin(entryId: string, adminId: string) {
  await db.transaction(async (tx) => {
    const current = await assertCanPublish(tx, entryId);
    await transitionEntry(tx, {
      entryId,
      from: ["archived"],
      to: "published",
      // Restarts the 12 month clock, so the next daily check does not archive a restored import again.
      patch: { importedAt: current.importedAt ? new Date() : null },
      actor: admin(adminId),
    });
  });
  invalidateMapDirectory();
}

// Untrusted listings send their owner's edits back through the review queue.
export async function setEntryTrusted(
  entryId: string,
  trusted: boolean,
  adminId: string,
) {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ trusted: entry.trusted })
      .from(entry)
      .where(eq(entry.id, entryId))
      .limit(1)
      .for("update");
    if (!row) throw new NotFoundError();
    await tx.update(entry).set({ trusted }).where(eq(entry.id, entryId));
    await writeChange(tx, {
      entityType: "entry",
      entityId: entryId,
      userId: adminId,
      source: "admin",
      action: "update",
      before: { trusted: row.trusted },
      after: { trusted },
    });
  });
}
