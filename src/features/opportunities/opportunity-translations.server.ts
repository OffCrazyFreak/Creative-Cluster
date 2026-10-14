import { and, eq, inArray } from "drizzle-orm";

import type { AppLocale } from "@/constants/locales";
import type { DbOrTx } from "@/db/client.server";
import { translation } from "@/db/schema";
import { safeParseRichText } from "@/lib/rich-text/parse-rich-text";
import type { RichTextDoc } from "@/typings/rich-text";

export interface IStoredTranslation {
  title?: string;
  // Plain text of the translated body, for list snippets.
  bodyText?: string;
  body?: RichTextDoc;
  origin?: "machine" | "human";
}

// A failed translation is stored as an empty row; those are skipped so the original shows.
export async function loadOpportunityTranslations(
  db: DbOrTx,
  ids: string[],
  locale: AppLocale,
): Promise<Map<string, IStoredTranslation>> {
  const result = new Map<string, IStoredTranslation>();
  if (ids.length === 0) return result;
  const rows = await db
    .select()
    .from(translation)
    .where(
      and(
        eq(translation.entityType, "opportunity"),
        eq(translation.locale, locale),
        inArray(translation.entityId, ids),
      ),
    );
  for (const row of rows) {
    if (!row.text.trim()) continue;
    const found = result.get(row.entityId) ?? {};
    if (row.field === "title") {
      found.title = row.text;
      found.origin = row.origin;
    }
    if (row.field === "body") {
      try {
        const parsed = safeParseRichText(JSON.parse(row.text));
        if (parsed?.text.trim()) {
          found.body = parsed.doc;
          found.bodyText = parsed.text;
        }
      } catch {
        // A stored translation that no longer parses is ignored; the original shows.
      }
    }
    result.set(row.entityId, found);
  }
  return result;
}
