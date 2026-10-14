import { and, eq, isNull, like, lt, sql } from "drizzle-orm";

import {
  APPLY_VERIFY_TTL_SECONDS,
  REJECTED_APPLICATION_RETENTION_DAYS,
} from "@/constants/apply";
import {
  ERASURE_GRACE_DAYS,
  ERASURE_MARKER_PREFIX,
  IMPORT_ARCHIVE_MONTHS,
} from "@/constants/lifecycle";
import { db } from "@/db/client.server";
import { entry, user, verification } from "@/db/schema";
import { auth } from "@/lib/auth/auth.server";
import { assertAdminsRemain } from "@/lib/auth/min-admins.server";
import { invalidateMapDirectory } from "@/features/directory/map-directory.server";

import { NotFoundError } from "@/server/errors";

import { transitionEntry } from "./entry-transitions.server";
import { purgeEntry } from "./purge-entry.server";
import { purgeErasedUser } from "./purge-erased-user.server";

// A first-year import cohort goes stale on one day; the rest is picked up by the following daily runs.
const PURGE_BATCH_SIZE = 500;

// Unclaimed imports nobody claimed within a year are hidden, never deleted: an admin can restore them.
export async function archiveStaleImports(): Promise<number> {
  const stale = await db
    .select({ id: entry.id })
    .from(entry)
    .where(
      and(
        eq(entry.status, "published"),
        isNull(entry.ownerUserId),
        lt(
          entry.importedAt,
          sql`now() - make_interval(months => ${IMPORT_ARCHIVE_MONTHS})`,
        ),
      ),
    )
    .limit(PURGE_BATCH_SIZE);
  let archived = 0;
  for (const { id } of stale) {
    try {
      await db.transaction((tx) =>
        transitionEntry(tx, {
          entryId: id,
          from: ["published"],
          to: "archived",
          actor: { userId: null, source: "system" },
        }),
      );
      archived += 1;
    } catch (error) {
      // Claimed or changed since the query: skip it, one listing must not stop the rest.
      if (!(error instanceof NotFoundError))
        console.error("archiving an import failed", id, error);
    }
  }
  if (archived) invalidateMapDirectory();
  return archived;
}

// Rejected applications are kept 90 days for resubmission; applications never confirmed by email expire with their link.
export async function purgeExpiredApplications(): Promise<number> {
  const expiredCondition = sql`(${entry.status} = 'rejected' and ${entry.updatedAt} < now() - make_interval(days => ${REJECTED_APPLICATION_RETENTION_DAYS}))
        or (${entry.status} = 'draft' and ${entry.ownerUserId} is null and ${entry.importedAt} is null and ${entry.updatedAt} < now() - make_interval(secs => ${APPLY_VERIFY_TTL_SECONDS}))`;
  const expired = await db
    .select({ id: entry.id })
    .from(entry)
    .where(expiredCondition)
    .limit(PURGE_BATCH_SIZE);
  let purged = 0;
  for (const { id } of expired) {
    try {
      // Re-checked under the lock: an applicant may have verified or resubmitted since the query.
      const done = await db.transaction((tx) =>
        purgeEntry(tx, id, sql`(${expiredCondition})`),
      );
      if (done) purged += 1;
    } catch (error) {
      console.error("purging an application failed", id, error);
    }
  }
  await db
    .delete(verification)
    .where(
      and(
        like(verification.identifier, "apply-%"),
        lt(verification.expiresAt, new Date()),
      ),
    );
  return purged;
}

// Deletes accounts whose 14 day grace period is over. The admin rule is checked and the data purged first:
// better-auth removes sessions and credentials before its delete hook runs, so a refusal there would lock the person out.
export async function deleteDueErasedAccounts(): Promise<number> {
  const due = await db
    .select({ identifier: verification.identifier })
    .from(verification)
    .where(
      and(
        like(verification.identifier, `${ERASURE_MARKER_PREFIX}%`),
        lt(
          verification.createdAt,
          sql`now() - make_interval(days => ${ERASURE_GRACE_DAYS})`,
        ),
      ),
    );
  const context = await auth.$context;
  let deleted = 0;
  for (const { identifier } of due) {
    const userId = identifier.slice(ERASURE_MARKER_PREFIX.length);
    try {
      const [account] = await db
        .select({ id: user.id, email: user.email, locale: user.locale })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);
      if (account) {
        await assertAdminsRemain(userId);
        // Not due by the app clock yet (it may lag the database): leave the marker for the next run.
        if (!(await purgeErasedUser(account))) continue;
        await context.internalAdapter.deleteUser(userId);
      }
      await db
        .delete(verification)
        .where(eq(verification.identifier, identifier));
      deleted += 1;
    } catch (error) {
      // The last admins, or a transient failure: the marker stays and the next daily run retries.
      console.error("erasure of an account failed", userId, error);
    }
  }
  return deleted;
}
