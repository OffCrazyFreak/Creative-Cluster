import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db/client.server";
import { entry, link } from "@/db/schema";
import { findPublicEntryId } from "@/features/entry/public-entry.server";
import { publicEntryCondition } from "@/features/entry/public-entry-filter.server";

const MAX_SLUGS = 200;

// Slugs only: the map already holds every public pin, so coordinates never travel twice.
export async function connectionPartnerSlugs(slug: string): Promise<string[]> {
  const found = await findPublicEntryId(slug);
  if (!found) return [];
  const rows = await db
    .select({ slug: entry.slug })
    .from(link)
    .innerJoin(
      entry,
      eq(
        entry.id,
        sql`case when ${link.fromId} = ${found.id} then ${link.toId} else ${link.fromId} end`,
      ),
    )
    .where(
      and(
        eq(link.status, "confirmed"),
        sql`${found.id} in (${link.fromId}, ${link.toId})`,
        publicEntryCondition(),
      ),
    )
    .limit(MAX_SLUGS);
  return rows.map((row) => row.slug);
}
