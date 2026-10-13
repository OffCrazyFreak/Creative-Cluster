import { asc, eq, sql } from "drizzle-orm";

import { db } from "@/db/client.server";
import { tag, user } from "@/db/schema";

import type { IAdminTagRow } from "./tag-schemas";
import { tagOptionColumns } from "./tag-visibility.server";

export async function listAdminTags(): Promise<IAdminTagRow[]> {
  const rows = await db
    .select({
      ...tagOptionColumns,
      sourceUri: tag.sourceUri,
      canonicalId: tag.canonicalId,
      createdAt: tag.createdAt,
      suggestedByName: user.name,
      usage: sql<number>`(select count(distinct et.entry_id)::int from entry_tag et where et.tag_id = ${tag.id})`,
    })
    .from(tag)
    .leftJoin(user, eq(user.id, tag.suggestedBy))
    .orderBy(asc(tag.labelEn));
  return rows;
}
