import { eq } from "drizzle-orm";

import { LOCALES } from "@/constants/locales";
import { db, type Tx } from "@/db/client.server";
import { entry, user } from "@/db/schema";
import { invalidateMapDirectory } from "@/features/directory/map-directory.server";
import { pageLink } from "@/lib/auth/auth-email.server";
import { writeChange } from "@/lib/change-log/write-change.server";
import { enqueueEmail } from "@/lib/email/enqueue-email.server";
import { NotFoundError } from "@/server/errors";
import { site } from "@/sites";

import { transitionEntry, type IActor } from "./entry-transitions.server";

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
  const locale = LOCALES.find((l) => l === owner.locale) ?? site.baseLocale;
  await enqueueEmail(tx, {
    template: "suspended",
    to: owner.email,
    props: {
      locale,
      entryName: row.name,
      reason,
      link: pageLink("/account", locale),
    },
    idempotencyKey: `suspended:${row.id}:${Date.now()}`,
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
    const [row] = await tx
      .select({ erasure: entry.erasureRequestedAt })
      .from(entry)
      .where(eq(entry.id, entryId))
      .limit(1);
    // A listing queued for deletion stays hidden until the owner cancels it.
    if (!row || row.erasure) throw new NotFoundError();
    await transitionEntry(tx, {
      entryId,
      from: ["suspended"],
      to: "published",
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
      from: ["published", "suspended"],
      to: "archived",
      patch: { suspendedReason: null },
      actor: admin(adminId),
    }),
  );
  invalidateMapDirectory();
}

// Restores an archived listing (for example an unclaimed import the 12 month check archived).
export async function restoreEntryAsAdmin(entryId: string, adminId: string) {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ erasure: entry.erasureRequestedAt })
      .from(entry)
      .where(eq(entry.id, entryId))
      .limit(1);
    if (!row || row.erasure) throw new NotFoundError();
    await transitionEntry(tx, {
      entryId,
      from: ["archived"],
      to: "published",
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
