import { and, eq } from "drizzle-orm";

import type { AppLocale } from "@/constants/locales";
import { db } from "@/db/client.server";
import { entry, translation } from "@/db/schema";
import { publicEntryCondition } from "@/features/entry/public-entry-filter.server";
import { safeParseRichText } from "@/lib/rich-text/parse-rich-text";
import {
  TRANSLATED_FIELDS,
  type ITranslatedText,
  toSerializableDoc,
  type ITranslationView,
  type TranslatedField,
} from "./translation-fields";

function isTranslatedField(value: string): value is TranslatedField {
  return TRANSLATED_FIELDS.some((field) => field === value);
}

function toText(
  field: TranslatedField,
  row: { text: string; origin: "machine" | "human" },
): ITranslatedText | null {
  if (field !== "description") {
    return { text: row.text, doc: null, origin: row.origin };
  }
  let json: unknown;
  try {
    json = JSON.parse(row.text);
  } catch {
    return null;
  }
  // Stored JSON is re-validated on read so a bad row can never reach the renderer.
  const parsed = safeParseRichText(json);
  if (!parsed || !parsed.text.trim()) return null;
  return {
    text: parsed.text,
    doc: toSerializableDoc(parsed.doc),
    origin: row.origin,
  };
}

// null when the visitor reads the owner's own language or the entry is not public. Looked up by
// id and re-checked for visibility here: the caller's entry data is never trusted.
export async function loadEntryTranslation(
  entryId: string,
  locale: AppLocale,
  viewerId: string | null,
): Promise<ITranslationView | null> {
  const [row] = await db
    .select({
      id: entry.id,
      ownerUserId: entry.ownerUserId,
      sourceLocale: entry.sourceLocale,
      descriptionText: entry.descriptionText,
      offeringText: entry.offeringText,
      seekingText: entry.seekingText,
    })
    .from(entry)
    .where(and(publicEntryCondition(), eq(entry.id, entryId)))
    .limit(1);
  if (!row || row.sourceLocale === locale) return null;

  const rows = await db
    .select()
    .from(translation)
    .where(
      and(
        eq(translation.entityType, "entry"),
        eq(translation.entityId, row.id),
        eq(translation.locale, locale),
      ),
    );

  const original: Record<TranslatedField, string> = {
    description: row.descriptionText,
    offering: row.offeringText,
    seeking: row.seekingText,
  };
  const sourceFields = TRANSLATED_FIELDS.filter((f) => original[f].trim());

  // Rows of emptied fields and empty failure markers are not text on the page.
  const texts: ITranslationView["texts"] = {};
  for (const item of rows) {
    if (!isTranslatedField(item.field) || !item.text.trim()) continue;
    if (!sourceFields.includes(item.field)) continue;
    const text = toText(item.field, item);
    if (text) texts[item.field] = text;
  }
  return {
    entryId: row.id,
    locale,
    sourceLocale: row.sourceLocale as AppLocale,
    texts,
    sourceFields,
    canEdit: Boolean(viewerId && viewerId === row.ownerUserId),
  };
}
