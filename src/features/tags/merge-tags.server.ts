import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db/client.server";
import { entryTag, opportunityTag, reviewItem, tag } from "@/db/schema";
import { writeChange } from "@/lib/change-log/write-change.server";
import { NotFoundError } from "@/server/errors";

import { TagSelectionError } from "./tag-errors";
import { cleanAliases } from "./update-tag.server";

interface IMergeTags {
  sourceId: string;
  targetId: string;
  adminId: string;
}

// Folds source into target atomically: usage, children and aliases move, source points back via canonical_id.
export async function mergeTags({ sourceId, targetId, adminId }: IMergeTags) {
  if (sourceId === targetId)
    throw new TagSelectionError("Cannot merge a tag into itself");

  await db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(tag)
      .where(inArray(tag.id, [sourceId, targetId]))
      .orderBy(tag.id)
      .for("update");
    const source = rows.find((row) => row.id === sourceId);
    const target = rows.find((row) => row.id === targetId);
    if (!source || !target) throw new NotFoundError();
    if (
      source.canonicalId ||
      target.canonicalId ||
      target.status !== "active"
    ) {
      throw new TagSelectionError("Target must be an active, unmerged tag");
    }

    await tx.execute(sql`
      insert into entry_tag (entry_id, tag_id, field)
      select entry_id, ${targetId}, field from entry_tag where tag_id = ${sourceId}
      on conflict do nothing`);
    await tx.delete(entryTag).where(eq(entryTag.tagId, sourceId));
    await tx.execute(sql`
      insert into opportunity_tag (opportunity_id, tag_id)
      select opportunity_id, ${targetId} from opportunity_tag where tag_id = ${sourceId}
      on conflict do nothing`);
    await tx.delete(opportunityTag).where(eq(opportunityTag.tagId, sourceId));

    await tx
      .update(tag)
      .set({ parentId: targetId })
      .where(eq(tag.parentId, sourceId));
    await tx
      .update(tag)
      .set({ canonicalId: targetId })
      .where(eq(tag.canonicalId, sourceId));
    const targetParent = target.parentId === sourceId ? null : target.parentId;

    const aliasesEn = cleanAliases(
      [...target.aliasesEn, ...source.aliasesEn, source.labelEn],
      target.labelEn,
    );
    const aliasesHr = cleanAliases(
      [...target.aliasesHr, ...source.aliasesHr, source.labelHr],
      target.labelHr,
    );
    await tx
      .update(tag)
      .set({ aliasesEn, aliasesHr, parentId: targetParent })
      .where(eq(tag.id, targetId));
    await tx
      .update(tag)
      .set({
        canonicalId: targetId,
        parentId: null,
        status: source.status === "suggested" ? "rejected" : source.status,
      })
      .where(eq(tag.id, sourceId));
    await tx
      .update(reviewItem)
      .set({ status: "approved", decidedBy: adminId, decidedAt: new Date() })
      .where(
        and(
          eq(reviewItem.entityType, "tag"),
          eq(reviewItem.entityId, sourceId),
          eq(reviewItem.status, "open"),
        ),
      );
    await writeChange(tx, {
      entityType: "tag",
      entityId: sourceId,
      userId: adminId,
      source: "admin",
      action: "update",
      before: { canonicalId: null },
      after: { canonicalId: targetId, mergedInto: target.slug },
    });
  });
}
