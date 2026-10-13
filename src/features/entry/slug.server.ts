import { eq, sql } from "drizzle-orm";

import { RESERVED_SLUGS } from "@/constants/slugs";
import type { DbOrTx, Tx } from "@/db/client.server";
import { entry, slugHistory } from "@/db/schema";
import { slugify } from "@/utils/slugify";

const reserved = new Set<string>(RESERVED_SLUGS);

async function isTaken(db: DbOrTx, slug: string): Promise<boolean> {
  if (reserved.has(slug)) return true;
  const [current] = await db
    .select({ id: entry.id })
    .from(entry)
    .where(sql`lower(${entry.slug}) = ${slug}`)
    .limit(1);
  if (current) return true;
  const [old] = await db
    .select({ id: slugHistory.id })
    .from(slugHistory)
    .where(sql`lower(${slugHistory.slug}) = ${slug}`)
    .limit(1);
  return Boolean(old);
}

// Lowercase ASCII from the name, `-2`, `-3` on collision; old slugs stay reserved through slug_history.
export async function allocateSlug(db: DbOrTx, name: string): Promise<string> {
  const base = slugify(name) || "entry";
  for (let attempt = 1; ; attempt += 1) {
    const candidate = attempt === 1 ? base : `${base}-${attempt}`;
    if (!(await isTaken(db, candidate))) return candidate;
  }
}

// Slugs are frozen after publishing except when an admin changes one; the old one then redirects.
export async function changeEntrySlug(
  tx: Tx,
  entryId: string,
  newSlug: string,
): Promise<void> {
  const [current] = await tx
    .select({ slug: entry.slug })
    .from(entry)
    .where(eq(entry.id, entryId))
    .limit(1);
  if (!current || current.slug === newSlug) return;
  // The history slug is unique on lower(slug): reclaiming an old slug removes its redirect first.
  await tx
    .delete(slugHistory)
    .where(sql`lower(${slugHistory.slug}) = lower(${newSlug})`);
  await tx.insert(slugHistory).values({ entryId, slug: current.slug });
  await tx.update(entry).set({ slug: newSlug }).where(eq(entry.id, entryId));
}
