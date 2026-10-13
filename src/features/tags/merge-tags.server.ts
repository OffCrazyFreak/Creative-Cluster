import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db/client.server";
import { entryTag, opportunityTag, reviewItem, tag } from "@/db/schema";
import { writeChange } from "@/lib/change-log/write-change.server";
import { NotFoundError } from "@/server/errors";

import { TagSelectionError } from "./tag-errors";
import { MAX_TAG_ALIASES } from "./tag-schemas";
import { logUsageRewrite, snapshotUsage } from "./tag-usage-log.server";
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

    const children = await tx
      .select({ id: tag.id, slug: tag.slug })
      .from(tag)
      .where(eq(tag.parentId, sourceId));
    // Moving the children under a tag that has its own parent would make a second level.
    if (children.length && target.parentId && target.parentId !== sourceId) {
      throw new TagSelectionError("Merge would nest tags two levels deep");
    }

    const usage = await snapshotUsage(tx, sourceId);
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
    await logUsageRewrite(tx, usage, {
      from: source.slug,
      to: target.slug,
      adminId,
    });

    await tx
      .update(tag)
      .set({ parentId: targetId })
      .where(eq(tag.parentId, sourceId));
    await tx
      .update(tag)
      .set({ canonicalId: targetId })
      .where(eq(tag.canonicalId, sourceId));
    for (const child of children.filter((row) => row.id !== targetId)) {
      await writeChange(tx, {
        entityType: "tag",
        entityId: child.id,
        userId: adminId,
        source: "admin",
        action: "update",
        before: { parent: source.slug },
        after: { parent: target.slug },
      });
    }
    const targetParent = target.parentId === sourceId ? null : target.parentId;

    // The old names go first: they are what people will still type.
    const aliasesEn = cleanAliases(
      [source.labelEn, ...target.aliasesEn, ...source.aliasesEn],
      target.labelEn,
    ).slice(0, MAX_TAG_ALIASES);
    const aliasesHr = cleanAliases(
      [source.labelHr, ...target.aliasesHr, ...source.aliasesHr],
      target.labelHr,
    ).slice(0, MAX_TAG_ALIASES);
    await tx
      .update(tag)
      .set({ aliasesEn, aliasesHr, parentId: targetParent })
      .where(eq(tag.id, targetId));
    await writeChange(tx, {
      entityType: "tag",
      entityId: targetId,
      userId: adminId,
      source: "admin",
      action: "update",
      before: {
        aliasesEn: target.aliasesEn,
        aliasesHr: target.aliasesHr,
        parentId: target.parentId,
      },
      after: { aliasesEn, aliasesHr, parentId: targetParent },
    });
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
