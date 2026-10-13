import { and, count, eq, like } from "drizzle-orm";

import type { AppLocale } from "@/constants/locales";
import { db } from "@/db/client.server";
import { reviewItem, tag } from "@/db/schema";
import { writeChange } from "@/lib/change-log/write-change.server";
import { LimitError } from "@/server/errors";
import { slugify } from "@/utils/slugify";

import { foldText, tagAliases, tagLabel } from "./tag-label";
import type { ITagOption } from "./tag-schemas";
import { tagOptionColumns, usableTagCondition } from "./tag-visibility.server";

// Caps what one account can leave in the review queue at a time.
export const MAX_OPEN_SUGGESTIONS = 10;

interface ISuggestTag {
  userId: string;
  label: string;
  locale: AppLocale;
}

async function freeSlug(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  base: string,
) {
  const taken = new Set(
    (
      await tx
        .select({ slug: tag.slug })
        .from(tag)
        .where(like(tag.slug, `${base}%`))
    ).map((row) => row.slug),
  );
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

// The other language gets the same text until an admin translates it on approval.
export async function suggestTag({
  userId,
  label,
  locale,
}: ISuggestTag): Promise<{ tag: ITagOption; created: boolean }> {
  return db.transaction(async (tx) => {
    const visible = await tx
      .select(tagOptionColumns)
      .from(tag)
      .where(usableTagCondition({ userId }));
    const folded = foldText(label);
    const existing = visible.find((option) =>
      [tagLabel(option, locale), ...tagAliases(option, locale)].some(
        (text) => foldText(text) === folded,
      ),
    );
    if (existing) return { tag: existing, created: false };

    const [{ open }] = await tx
      .select({ open: count() })
      .from(tag)
      .where(and(eq(tag.status, "suggested"), eq(tag.suggestedBy, userId)));
    if (open >= MAX_OPEN_SUGGESTIONS) throw new LimitError();

    const slug = await freeSlug(tx, slugify(label) || "tag");
    const [created] = await tx
      .insert(tag)
      .values({
        slug,
        labelEn: label,
        labelHr: label,
        status: "suggested",
        suggestedBy: userId,
      })
      .returning(tagOptionColumns);
    await tx.insert(reviewItem).values({
      type: "tag",
      entityType: "tag",
      entityId: created.id,
      payload: { label, locale },
    });
    await writeChange(tx, {
      entityType: "tag",
      entityId: created.id,
      userId,
      source: "owner",
      action: "create",
      after: { slug, label, status: "suggested" },
    });
    return { tag: created, created: true };
  });
}
