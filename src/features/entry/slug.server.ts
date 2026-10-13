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
// Throws when the new slug is reserved, used by another entry or redirecting to another entry.
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
  if (reserved.has(newSlug)) throw new Error("Slug is reserved");

  const [other] = await tx
    .select({ id: entry.id })
    .from(entry)
    .where(sql`lower(${entry.slug}) = ${newSlug} and ${entry.id} <> ${entryId}`)
    .limit(1);
  if (other) throw new Error("Slug is taken");

  const [history] = await tx
    .select({ id: slugHistory.id, entryId: slugHistory.entryId })
    .from(slugHistory)
    .where(sql`lower(${slugHistory.slug}) = ${newSlug}`)
    .limit(1);
  if (history && history.entryId !== entryId) throw new Error("Slug is taken");
  // The history slug is unique on lower(slug): reclaiming the entry's own old slug drops that redirect.
  if (history)
    await tx.delete(slugHistory).where(eq(slugHistory.id, history.id));

  await tx.insert(slugHistory).values({ entryId, slug: current.slug });
  await tx.update(entry).set({ slug: newSlug }).where(eq(entry.id, entryId));
}
