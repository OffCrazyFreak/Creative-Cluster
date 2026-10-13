import { and, eq, inArray, isNull, or } from "drizzle-orm";

import { tag } from "@/db/schema";

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
