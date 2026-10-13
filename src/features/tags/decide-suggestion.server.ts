import { and, eq } from "drizzle-orm";

import { db } from "@/db/client.server";
import { entryTag, opportunityTag, reviewItem, tag } from "@/db/schema";
import { writeChange } from "@/lib/change-log/write-change.server";
import { NotFoundError } from "@/server/errors";

interface IDecideSuggestion {
  tagId: string;
  decision: "approve" | "reject";
  adminId: string;
}

export async function decideSuggestion({
  tagId,
  decision,
  adminId,
}: IDecideSuggestion) {
  const status = decision === "approve" ? "active" : "rejected";
  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(tag)
      .set({ status })
      .where(and(eq(tag.id, tagId), eq(tag.status, "suggested")))
      .returning({ id: tag.id });
    if (!updated) throw new NotFoundError();

    // A rejected tag must not linger on the suggester's listing.
    if (decision === "reject") {
      await tx.delete(entryTag).where(eq(entryTag.tagId, tagId));
      await tx.delete(opportunityTag).where(eq(opportunityTag.tagId, tagId));
    }
    await tx
      .update(reviewItem)
      .set({
        status: decision === "approve" ? "approved" : "rejected",
        decidedBy: adminId,
        decidedAt: new Date(),
      })
      .where(
        and(
          eq(reviewItem.entityType, "tag"),
          eq(reviewItem.entityId, tagId),
          eq(reviewItem.status, "open"),
        ),
      );
    await writeChange(tx, {
      entityType: "tag",
      entityId: tagId,
      userId: adminId,
      source: "admin",
      action: "status_change",
      before: { status: "suggested" },
      after: { status },
    });
  });
}
