import { and, eq, isNull, like, lt, sql } from "drizzle-orm";

import {
  APPLY_VERIFY_TTL_SECONDS,
  REJECTED_APPLICATION_RETENTION_DAYS,
} from "@/constants/apply";
import { db } from "@/db/client.server";
import { entry, verification } from "@/db/schema";
import { invalidateMapDirectory } from "@/features/directory/map-directory.server";

import { transitionEntry } from "./entry-transitions.server";
import { purgeEntry } from "./purge-entry.server";

export const IMPORT_ARCHIVE_MONTHS = 12;

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
    );
  for (const { id } of stale)
    await db.transaction((tx) =>
      transitionEntry(tx, {
        entryId: id,
        from: ["published"],
        to: "archived",
        actor: { userId: null, source: "system" },
      }),
    );
  if (stale.length) invalidateMapDirectory();
  return stale.length;
}

// Rejected applications are kept 90 days for resubmission; applications never confirmed by email expire with their link.
export async function purgeExpiredApplications(): Promise<number> {
  const expired = await db
    .select({ id: entry.id })
    .from(entry)
    .where(
      sql`(${entry.status} = 'rejected' and ${entry.updatedAt} < now() - make_interval(days => ${REJECTED_APPLICATION_RETENTION_DAYS}))
        or (${entry.status} = 'draft' and ${entry.ownerUserId} is null and ${entry.importedAt} is null and ${entry.createdAt} < now() - make_interval(secs => ${APPLY_VERIFY_TTL_SECONDS}))`,
    );
  for (const { id } of expired)
    await db.transaction((tx) => purgeEntry(tx, id));
  await db
    .delete(verification)
    .where(
      and(
        like(verification.identifier, "apply-%"),
        lt(verification.expiresAt, new Date()),
      ),
    );
  return expired.length;
}
