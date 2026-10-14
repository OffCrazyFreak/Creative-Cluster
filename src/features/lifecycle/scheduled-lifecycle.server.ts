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
import { entry, verification } from "@/db/schema";
import { auth } from "@/lib/auth/auth.server";
import { invalidateMapDirectory } from "@/features/directory/map-directory.server";

import { transitionEntry } from "./entry-transitions.server";
import { purgeEntry } from "./purge-entry.server";

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

// Deletes accounts whose 14 day grace period is over. better-auth's delete hook purges their listing data.
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
      await context.internalAdapter.deleteUser(userId);
      await db
        .delete(verification)
        .where(eq(verification.identifier, identifier));
      deleted += 1;
    } catch (error) {
      // An admin who must stay (minimum admins rule) or a transient failure: the next daily run retries.
      console.error("erasure of an account failed", userId, error);
    }
  }
  return deleted;
}
