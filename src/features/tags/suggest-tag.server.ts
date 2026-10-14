import { and, count, eq, sql } from "drizzle-orm";

import type { AppLocale } from "@/constants/locales";
import { db, type DbOrTx, type Tx } from "@/db/client.server";
import { reviewItem, tag } from "@/db/schema";
import { enforceLimits } from "@/lib/limits/check-limit.server";
import { writeChange } from "@/lib/change-log/write-change.server";
import { LimitError } from "@/server/errors";
import { slugify } from "@/utils/slugify";

import { TagSelectionError } from "./tag-errors";
import { foldText, tagAliases, tagLabel } from "./tag-label";
import type { ITagOption } from "./tag-schemas";
import { tagOptionColumns, usableTagCondition } from "./tag-visibility.server";

// Caps what one account can leave in the review queue at a time.
export const MAX_OPEN_SUGGESTIONS = 10;
// Above the open-suggestion cap so a few rejected suggestions do not lock a user out.
const SUGGESTIONS_PER_HOUR = 30;
// Picking a label that already exists is normal use, so it only gets a loose ceiling.
const LOOKUPS_PER_HOUR = 300;

type SuggestionValues = Pick<
  typeof tag.$inferInsert,
  "labelEn" | "labelHr" | "status" | "suggestedBy"
>;

interface ISuggestTag {
  userId: string;
  label: string;
  locale: AppLocale;
}

const MAX_SLUG_ATTEMPTS = 25;

function isUniqueViolation(error: unknown) {
  const cause = (error as { cause?: { code?: string } }).cause;
  return (
    (error as { code?: string }).code === "23505" || cause?.code === "23505"
  );
}

// The unique index decides who owns a slug; a savepoint lets the loop retry after a collision.
async function insertSuggestion(
  tx: Tx,
  base: string,
  values: SuggestionValues,
) {
  for (let n = 1; n <= MAX_SLUG_ATTEMPTS; n += 1) {
    const slug = n === 1 ? base : `${base}-${n}`;
    try {
      return await tx.transaction(async (sp) => {
        const [row] = await sp
          .insert(tag)
          .values({ ...values, slug })
          .returning(tagOptionColumns);
        return row;
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }
  throw new TagSelectionError("Could not find a free slug");
}

// slugify falls back to "entry" for labels with no usable characters; a tag should not.
function slugBase(label: string) {
  const slug = slugify(label);
  return slug === "entry" && foldText(label) !== "entry" ? "tag" : slug;
}

async function findUsableTag(
  executor: DbOrTx,
  { userId, label, locale }: ISuggestTag,
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

// The other language gets the same text until an admin translates it on approval.
export async function suggestTag(
  input: ISuggestTag,
): Promise<{ tag: ITagOption; created: boolean }> {
  const { userId, label, locale } = input;
  await enforceLimits([
    {
      key: `tag-lookup:${userId}`,
      max: LOOKUPS_PER_HOUR,
      windowSeconds: 3600,
    },
  ]);
  const known = await findUsableTag(db, input);
  if (known) return { tag: known, created: false };
  // Counted outside the transaction so refused attempts still use up the budget.
  await enforceLimits([
    {
      key: `tag-suggest:${userId}`,
      max: SUGGESTIONS_PER_HOUR,
      windowSeconds: 3600,
    },
  ]);
  return db.transaction(async (tx) => {
    // Serialises one account's suggestions so the duplicate check and the cap cannot race.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
    const existing = await findUsableTag(tx, input);
    if (existing) return { tag: existing, created: false };

    const [{ open }] = await tx
      .select({ open: count() })
      .from(tag)
      .where(and(eq(tag.status, "suggested"), eq(tag.suggestedBy, userId)));
    if (open >= MAX_OPEN_SUGGESTIONS) throw new LimitError();

    const created = await insertSuggestion(tx, slugBase(label), {
      labelEn: label,
      labelHr: label,
      status: "suggested",
      suggestedBy: userId,
    });
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
      after: { slug: created.slug, label, status: "suggested" },
    });
    return { tag: created, created: true };
  });
}
