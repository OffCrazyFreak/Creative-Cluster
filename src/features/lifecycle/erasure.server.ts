import { and, desc, eq, isNotNull } from "drizzle-orm";

import {
  ERASURE_GRACE_DAYS,
  ERASURE_MARKER_PREFIX,
  ERASURE_MARKER_TTL_DAYS,
} from "@/constants/lifecycle";
import { LOCALES } from "@/constants/locales";
import type { EntryStatus } from "@/constants/entry";
import { db, type DbOrTx, type Tx } from "@/db/client.server";
import { changeLog, entry, user, verification } from "@/db/schema";
import { invalidateMapDirectory } from "@/features/directory/map-directory.server";
import { pageLink } from "@/lib/auth/auth-email.server";
import { writeChange } from "@/lib/change-log/write-change.server";
import { enqueueEmail } from "@/lib/email/enqueue-email.server";
import { NotFoundError } from "@/server/errors";
import { site } from "@/sites";

import { transitionEntry } from "./entry-transitions.server";
import type { IErasureState } from "./lifecycle-schemas";

const DAY_MS = 86_400_000;
const ALL_STATUSES: EntryStatus[] = [
  "draft",
  "pending",
  "published",
  "suspended",
  "rejected",
  "archived",
];

function marker(userId: string) {
  return `${ERASURE_MARKER_PREFIX}${userId}`;
}

async function markerRow(tx: DbOrTx, userId: string, lock = false) {
  const query = tx
    .select()
    .from(verification)
    .where(eq(verification.identifier, marker(userId)))
    .limit(1);
  const [row] = await (lock ? query.for("update") : query);
  return row;
}

function deleteDateOf(requestedAt: Date): Date {
  return new Date(requestedAt.getTime() + ERASURE_GRACE_DAYS * DAY_MS);
}

export async function getErasureState(userId: string): Promise<IErasureState> {
  const row = await markerRow(db, userId);
  return {
    scheduledFor: row ? deleteDateOf(row.createdAt).toISOString() : null,
  };
}

// Archives the listing at once and starts the grace period. The purge job does the rest after 14 days.
export async function requestErasure(userId: string): Promise<IErasureState> {
  const scheduledFor = await db.transaction(async (tx) => {
    // Locking the account row serialises two requests, so only one marker is ever written.
    const [account] = await tx
      .select({ email: user.email, locale: user.locale })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)
      .for("update");
    if (!account) throw new NotFoundError();
    const existing = await markerRow(tx, userId);
    if (existing) return deleteDateOf(existing.createdAt);

    // The row's own created_at is the one clock for the grace period, so asking twice shows the same date.
    const [created] = await tx
      .insert(verification)
      .values({
        identifier: marker(userId),
        value: "erasure",
        expiresAt: new Date(Date.now() + ERASURE_MARKER_TTL_DAYS * DAY_MS),
      })
      .returning({ createdAt: verification.createdAt });
    const now = created.createdAt;
    const owned = await tx
      .select({ id: entry.id, name: entry.name })
      .from(entry)
      .where(eq(entry.ownerUserId, userId));
    for (const item of owned)
      await transitionEntry(tx, {
        entryId: item.id,
        from: ALL_STATUSES,
        to: "archived",
        patch: { erasureRequestedAt: now },
        actor: { userId, source: "owner" },
        ownerUserId: userId,
      });

    const locale = LOCALES.find((l) => l === account.locale) ?? site.baseLocale;
    const deleteDate = deleteDateOf(now);
    await enqueueEmail(tx, {
      template: "erasure_scheduled",
      to: account.email,
      props: {
        locale,
        entryName: owned[0]?.name ?? null,
        deleteDate: deleteDate.toISOString(),
        link: pageLink("/account/data", locale),
      },
      idempotencyKey: `erasure-scheduled:${userId}:${now.getTime()}`,
    });
    return deleteDate;
  });
  invalidateMapDirectory();
  return { scheduledFor: scheduledFor.toISOString() };
}

// The erasure change row stores the earlier status, so cancelling puts the listing back as it was.
async function previousState(tx: Tx, entryId: string) {
  const [row] = await tx
    .select({ before: changeLog.before })
    .from(changeLog)
    .where(
      and(
        eq(changeLog.entityId, entryId),
        eq(changeLog.action, "status_change"),
        eq(changeLog.source, "owner"),
      ),
    )
    .orderBy(desc(changeLog.createdAt))
    .limit(1);
  const status = row?.before?.status;
  const restorable: EntryStatus[] = ["published", "suspended", "archived"];
  return {
    status: restorable.find((s) => s === status) ?? ("archived" as const),
    suspendedReason:
      typeof row?.before?.suspendedReason === "string"
        ? row.before.suspendedReason
        : null,
  };
}

export async function cancelErasure(userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    // The lock makes cancel and the purge job take turns; once the grace period is over it is too late.
    const row = await markerRow(tx, userId, true);
    if (!row || deleteDateOf(row.createdAt) <= new Date())
      throw new NotFoundError();
    const flagged = await tx
      .select({ id: entry.id })
      .from(entry)
      .where(
        and(eq(entry.ownerUserId, userId), isNotNull(entry.erasureRequestedAt)),
      );
    for (const item of flagged) {
      const previous = await previousState(tx, item.id);
      await tx
        .update(entry)
        .set({
          status: previous.status,
          suspendedReason: previous.suspendedReason,
          erasureRequestedAt: null,
        })
        .where(eq(entry.id, item.id));
      await writeChange(tx, {
        entityType: "entry",
        entityId: item.id,
        userId,
        source: "owner",
        action: "status_change",
        before: { status: "archived" },
        after: { status: previous.status },
      });
    }
    await tx
      .delete(verification)
      .where(eq(verification.identifier, marker(userId)));
  });
  invalidateMapDirectory();
}
