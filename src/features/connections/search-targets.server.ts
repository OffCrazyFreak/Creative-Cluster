import { and, asc, sql } from "drizzle-orm";

import { db } from "@/db/client.server";
import { entry } from "@/db/schema";
import { publicEntryCondition } from "@/features/entry/public-entry-filter.server";

import type { ILinkTarget } from "./connections-schemas";

const MAX_RESULTS = 8;

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

// Only published listings that someone else owns (or nobody owns yet) can be proposed to.
export async function searchLinkTargets(
  query: string,
  userId: string,
): Promise<ILinkTarget[]> {
  return db
    .select({
      id: entry.id,
      name: entry.name,
      city: entry.city,
      countryCode: entry.countryCode,
    })
    .from(entry)
    .where(
      and(
        publicEntryCondition(),
        sql`${entry.name} ilike ${`%${escapeLike(query)}%`}`,
        sql`${entry.ownerUserId} is distinct from ${userId}`,
      ),
    )
    .orderBy(asc(sql`lower(${entry.name})`))
    .limit(MAX_RESULTS);
}
