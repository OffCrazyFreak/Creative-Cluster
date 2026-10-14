import { and, eq, isNull, like, lt, sql } from "drizzle-orm";

import {
  APPLY_VERIFY_TTL_SECONDS,
  REJECTED_APPLICATION_RETENTION_DAYS,
} from "@/constants/apply";
import { IMPORT_ARCHIVE_MONTHS } from "@/constants/lifecycle";
import { db } from "@/db/client.server";
import { entry, verification } from "@/db/schema";
import { invalidateMapDirectory } from "@/features/directory/map-directory.server";

import { NotFoundError } from "@/server/errors";

import { transitionEntry } from "./entry-transitions.server";
import { purgeEntry } from "./purge-entry.server";

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
