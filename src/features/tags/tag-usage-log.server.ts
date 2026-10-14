import { eq } from "drizzle-orm";

import type { Tx } from "@/db/client.server";
import { entryTag, opportunityTag, tag } from "@/db/schema";
import { writeChange } from "@/lib/change-log/write-change.server";

interface IUsage {
  entries: Map<string, { entryId: string; field: string; slugs: string[] }>;
  opportunities: Map<string, { opportunityId: string; slugs: string[] }>;
}

// Reads the tag lists that a reject or merge is about to change, so the log can show before and after.
export async function snapshotUsage(tx: Tx, tagId: string): Promise<IUsage> {
  const usage: IUsage = { entries: new Map(), opportunities: new Map() };
  const entryRows = await tx
    .select({ entryId: entryTag.entryId, field: entryTag.field })
    .from(entryTag)
    .where(eq(entryTag.tagId, tagId));
  for (const { entryId, field } of entryRows) {
    const all = await tx
      .select({ slug: tag.slug, field: entryTag.field })
      .from(entryTag)
      .innerJoin(tag, eq(tag.id, entryTag.tagId))
      .where(eq(entryTag.entryId, entryId));
    usage.entries.set(`${entryId}:${field}`, {
      entryId,
      field,
      slugs: all.filter((row) => row.field === field).map((row) => row.slug),
    });
  }
  const oppRows = await tx
    .select({ opportunityId: opportunityTag.opportunityId })
    .from(opportunityTag)
    .where(eq(opportunityTag.tagId, tagId));
  for (const { opportunityId } of oppRows) {
    const slugs = await tx
      .select({ slug: tag.slug })
      .from(opportunityTag)
      .innerJoin(tag, eq(tag.id, opportunityTag.tagId))
      .where(eq(opportunityTag.opportunityId, opportunityId));
    usage.opportunities.set(opportunityId, {
      opportunityId,
      slugs: slugs.map((row) => row.slug),
    });
  }
  return usage;
}

function replaced(slugs: string[], from: string, to: string | null) {
  const next = slugs.filter((slug) => slug !== from);
  if (to && !next.includes(to)) next.push(to);
  return next.sort();
}

export async function logUsageRewrite(
  tx: Tx,
  usage: IUsage,
  change: { from: string; to: string | null; adminId: string },
) {
  for (const row of usage.entries.values()) {
    await writeChange(tx, {
      entityType: "entry",
      entityId: row.entryId,
      userId: change.adminId,
      source: "admin",
      action: "update",
      before: { [`tags_${row.field}`]: [...row.slugs].sort() },
      after: {
        [`tags_${row.field}`]: replaced(row.slugs, change.from, change.to),
      },
    });
  }
  for (const row of usage.opportunities.values()) {
    await writeChange(tx, {
      entityType: "opportunity",
      entityId: row.opportunityId,
      userId: change.adminId,
      source: "admin",
      action: "update",
      before: { tags: [...row.slugs].sort() },
      after: { tags: replaced(row.slugs, change.from, change.to) },
    });
  }
}
