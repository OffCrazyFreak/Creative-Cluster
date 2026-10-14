import { and, asc, or, sql } from "drizzle-orm";

import { db } from "@/db/client.server";
import { entry } from "@/db/schema";
import { publicEntryCondition } from "@/features/entry/public-entry-filter.server";

import type { ISimilarEntry } from "./apply-schemas";

const MAX_HINTS = 3;

function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

// Public listings only: the hint must never reveal an application that is still in review.
export async function findSimilarEntries(
  name: string,
): Promise<ISimilarEntry[]> {
  const typed = escapeLike(name.trim().toLowerCase());
  const rows = await db
    .select({
      slug: entry.slug,
      name: entry.name,
      city: entry.city,
      unclaimed: sql<boolean>`${entry.ownerUserId} is null`,
    })
    .from(entry)
    .where(
      and(
        publicEntryCondition(),
        or(
          sql`lower(${entry.name}) like ${`%${typed}%`}`,
          // A longer typed name that contains an existing short name ("Studio X Zagreb" vs "Studio X").
          and(
            sql`length(${entry.name}) >= 4`,
            sql`strpos(${name.trim().toLowerCase()}, lower(${entry.name})) > 0`,
          ),
        ),
      ),
    )
    .orderBy(asc(sql`length(${entry.name})`))
    .limit(MAX_HINTS);
  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    city: row.city,
    claimable: row.unclaimed,
  }));
}
