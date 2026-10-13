import { eq } from "drizzle-orm";

import { db } from "@/db/client.server";
import { tag } from "@/db/schema";
import { writeChange } from "@/lib/change-log/write-change.server";
import { NotFoundError } from "@/server/errors";

import { foldText } from "./tag-label";

interface IUpdateTag {
  tagId: string;
  labelEn: string;
  labelHr: string;
  aliasesEn: string[];
  aliasesHr: string[];
  adminId: string;
}

export function cleanAliases(aliases: readonly string[], label: string) {
  const seen = new Set([foldText(label)]);
  return aliases
    .map((alias) => alias.trim())
    .filter((alias) => {
      const key = foldText(alias);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export async function updateTag({ tagId, adminId, ...next }: IUpdateTag) {
  const values = {
    labelEn: next.labelEn,
    labelHr: next.labelHr,
    aliasesEn: cleanAliases(next.aliasesEn, next.labelEn),
    aliasesHr: cleanAliases(next.aliasesHr, next.labelHr),
  };
  await db.transaction(async (tx) => {
    const [before] = await tx
      .select({
        labelEn: tag.labelEn,
        labelHr: tag.labelHr,
        aliasesEn: tag.aliasesEn,
        aliasesHr: tag.aliasesHr,
      })
      .from(tag)
      .where(eq(tag.id, tagId))
      .for("update");
    if (!before) throw new NotFoundError();
    await tx.update(tag).set(values).where(eq(tag.id, tagId));
    await writeChange(tx, {
      entityType: "tag",
      entityId: tagId,
      userId: adminId,
      source: "admin",
      action: "update",
      before,
      after: values,
    });
  });
}
