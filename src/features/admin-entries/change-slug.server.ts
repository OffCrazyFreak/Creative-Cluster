import { eq } from "drizzle-orm";

import { db } from "@/db/client.server";
import { entry } from "@/db/schema";
import { invalidateMapDirectory } from "@/features/directory/map-directory.server";
import { changeEntrySlug } from "@/features/entry/slug.server";

import type { OpResult, SlugError } from "./admin-entries-schemas";

export async function changeSlug(
  entryId: string,
  slug: string,
  adminId: string,
): Promise<OpResult<SlugError>> {
  try {
    const found = await db.transaction(async (tx) => {
      const [row] = await tx
        .select({ id: entry.id })
        .from(entry)
        .where(eq(entry.id, entryId))
        .limit(1);
      if (!row) return false;
      await changeEntrySlug(tx, entryId, slug, {
        userId: adminId,
        source: "admin",
      });
      return true;
    });
    if (!found) return { ok: false, error: "not_found" };
  } catch (error) {
    // changeEntrySlug signals both cases with a plain Error; its messages are the only contract.
    if (error instanceof Error && error.message === "Slug is taken")
      return { ok: false, error: "taken" };
    if (error instanceof Error && error.message.startsWith("Invalid slug"))
      return { ok: false, error: "invalid" };
    if (error instanceof Error && error.message === "Slug is reserved")
      return { ok: false, error: "invalid" };
    throw error;
  }
  invalidateMapDirectory();
  return { ok: true };
}
