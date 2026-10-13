import { and, eq, inArray, isNull } from "drizzle-orm";

import type { Db } from "@/db/client.server";
import { tag } from "@/db/schema";
import { writeChange } from "@/lib/change-log/write-change.server";

import type { ITagSeed } from "./seeds/seed-types";

// Insert-only by slug: reruns add new seed tags but never overwrite an admin's edits or merges.
export async function seedTags(db: Db, seed: readonly ITagSeed[]) {
  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(tag)
      .values(
        seed.map((item) => ({
          slug: item.slug,
          labelEn: item.labelEn,
          labelHr: item.labelHr,
          aliasesEn: [...(item.aliasesEn ?? [])],
          aliasesHr: [...(item.aliasesHr ?? [])],
          sourceUri: item.sourceUri ?? null,
        })),
      )
      .onConflictDoNothing({ target: tag.slug })
      .returning({ id: tag.id, slug: tag.slug });

    const parentSlugs = [...new Set(seed.flatMap((i) => i.parent ?? []))];
    const parents = parentSlugs.length
      ? await tx
          .select({ id: tag.id, slug: tag.slug })
          .from(tag)
          .where(inArray(tag.slug, parentSlugs))
      : [];
    const parentId = new Map(parents.map((row) => [row.slug, row.id]));
    for (const item of seed) {
      const id = item.parent ? parentId.get(item.parent) : undefined;
      if (!id) continue;
      await tx
        .update(tag)
        .set({ parentId: id })
        .where(
          and(
            eq(tag.slug, item.slug),
            isNull(tag.parentId),
            isNull(tag.canonicalId),
          ),
        );
    }

    for (const row of inserted) {
      await writeChange(tx, {
        entityType: "tag",
        entityId: row.id,
        userId: null,
        source: "import",
        action: "create",
        after: { slug: row.slug },
      });
    }
    return { total: seed.length, inserted: inserted.length };
  });
}
