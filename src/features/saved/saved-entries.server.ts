import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";

import { MAX_SAVED_ENTRIES } from "@/constants/saved";
import { db, type DbOrTx } from "@/db/client.server";
import { entry, savedEntry, user } from "@/db/schema";
import { publicEntryCondition } from "@/features/entry/public-entry-filter.server";
import { NotFoundError } from "@/server/errors";

import type { ISavedEntry } from "./saved-schemas";

function isUuid(key: string) {
  return z.uuid().safeParse(key).success;
}

// A saved entry that is suspended, archived or gone is not shown, so it can never block a slot.
export function listSavedEntries(
  userId: string,
  tx: DbOrTx = db,
): Promise<ISavedEntry[]> {
  return tx
    .select({ id: entry.id, slug: entry.slug, name: entry.name })
    .from(savedEntry)
    .innerJoin(entry, eq(entry.id, savedEntry.entryId))
    .where(and(eq(savedEntry.userId, userId), publicEntryCondition()))
    .orderBy(asc(savedEntry.position));
}

async function resolveKeys(tx: DbOrTx, input: string[]): Promise<string[]> {
  if (input.length === 0) return [];
  const keys = input.map((key) => key.toLowerCase());
  const ids = keys.filter(isUuid);
  const slugs = keys.filter((key) => !isUuid(key));
  const found = await tx
    .select({ id: entry.id, slug: entry.slug })
    .from(entry)
    .where(
      and(
        publicEntryCondition(),
        or(
          ids.length ? inArray(entry.id, ids) : undefined,
          slugs.length ? inArray(sql`lower(${entry.slug})`, slugs) : undefined,
        ),
      ),
    );
  const ordered = keys
    .map(
      (key) =>
        found.find((row) => row.id === key || row.slug.toLowerCase() === key)
          ?.id,
    )
    .filter((id): id is string => Boolean(id));
  return [...new Set(ordered)].slice(0, MAX_SAVED_ENTRIES);
}

// Each save replaces the whole list. Unknown and hidden entries are dropped before counting.
export async function replaceSavedList(
  userId: string,
  keys: string[],
): Promise<ISavedEntry[]> {
  return db.transaction(async (tx) => {
    // The account row lock serialises saves of one member, even while the list is still empty;
    // "no key update" leaves foreign key checks of other tables free.
    const [owner] = await tx
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)
      .for("no key update");
    if (!owner) throw new NotFoundError();
    const previous = await tx
      .select({ entryId: savedEntry.entryId, createdAt: savedEntry.createdAt })
      .from(savedEntry)
      .where(eq(savedEntry.userId, userId))
      .for("update");
    const ids = await resolveKeys(tx, keys);
    await tx.delete(savedEntry).where(eq(savedEntry.userId, userId));
    if (ids.length)
      await tx.insert(savedEntry).values(
        ids.map((entryId, position) => ({
          userId,
          entryId,
          position,
          // An entry kept across saves keeps the date it was first saved.
          createdAt: previous.find((row) => row.entryId === entryId)?.createdAt,
        })),
      );
    return listSavedEntries(userId, tx);
  });
}
