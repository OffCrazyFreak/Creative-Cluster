import { and, eq, inArray, isNull, or } from "drizzle-orm";

import type { DbOrTx } from "@/db/client.server";
import { tag } from "@/db/schema";
import type { AppLocale } from "@/constants/locales";

import { foldText, tagAliases, tagLabel } from "./tag-label";

// Merged tags (canonical_id set) are never offered again; their entries were repointed.
export const publicTagCondition = and(
  eq(tag.status, "active"),
  isNull(tag.canonicalId),
);

// A suggestion is usable by its suggester until an admin decides; admins can use any of them.
export function usableTagCondition(viewer: {
  userId: string | null;
  isAdmin?: boolean;
}) {
  if (viewer.isAdmin) {
    return and(
      inArray(tag.status, ["active", "suggested"]),
      isNull(tag.canonicalId),
    );
  }
  return and(
    isNull(tag.canonicalId),
    or(
      eq(tag.status, "active"),
      viewer.userId
        ? and(eq(tag.status, "suggested"), eq(tag.suggestedBy, viewer.userId))
        : undefined,
    ),
  );
}

export const tagOptionColumns = {
  id: tag.id,
  slug: tag.slug,
  labelEn: tag.labelEn,
  labelHr: tag.labelHr,
  aliasesEn: tag.aliasesEn,
  aliasesHr: tag.aliasesHr,
  parentId: tag.parentId,
  status: tag.status,
};

// Accents and case are ignored, and aliases count as the tag's label.
export async function findUsableTag(
  executor: DbOrTx,
  {
    userId,
    label,
    locale,
  }: { userId: string; label: string; locale: AppLocale },
) {
  const visible = await executor
    .select(tagOptionColumns)
    .from(tag)
    .where(usableTagCondition({ userId }));
  const folded = foldText(label);
  return visible.find((option) =>
    [tagLabel(option, locale), ...tagAliases(option, locale)].some(
      (text) => foldText(text) === folded,
    ),
  );
}
