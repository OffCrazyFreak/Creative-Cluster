import { eq, sql } from "drizzle-orm";

import { db } from "@/db/client.server";
import { entry, slugHistory } from "@/db/schema";

import type { EntryPageResult } from "./entry-schemas";
import { loadPublicTags } from "./entry-tags.server";
import { publicEntryCondition } from "./public-entry-filter.server";
import { redactEntry } from "./redact-entry";

function bySlug(slug: string) {
  return sql`lower(${entry.slug}) = lower(${slug})`;
}

// Current slug first, then slug_history (old links 301 to the current slug).
// Suspended entries answer "gone" (410); every other non-public state is "missing" (404).
export async function findEntryForPage(
  slug: string,
  isMember: boolean,
): Promise<EntryPageResult> {
  const [row] = await db.select().from(entry).where(bySlug(slug)).limit(1);

  if (!row) {
    const [old] = await db
      .select({ slug: entry.slug, status: entry.status, kind: entry.kind })
      .from(slugHistory)
      .innerJoin(entry, eq(entry.id, slugHistory.entryId))
      .where(sql`lower(${slugHistory.slug}) = lower(${slug})`)
      .limit(1);
    if (old && ["published", "suspended"].includes(old.status))
      return { status: "redirect", slug: old.slug };
    return { status: "missing" };
  }

  if (row.status === "suspended") return { status: "gone" };
  if (row.status !== "published" || row.kind === "outside_partner")
    return { status: "missing" };
  if (row.slug !== slug) return { status: "redirect", slug: row.slug };

  const tags = await loadPublicTags(db, [row.id]);
  return {
    status: "found",
    entry: redactEntry(row, tags.get(row.id) ?? [], isMember),
  };
}

export async function findPublicEntryId(slug: string) {
  const [row] = await db
    .select({ id: entry.id, ownerUserId: entry.ownerUserId })
    .from(entry)
    .where(sql`${publicEntryCondition()} and ${bySlug(slug)}`)
    .limit(1);
  return row ?? null;
}
