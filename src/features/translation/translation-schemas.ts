import { z } from "zod";

import { LOCALES, type AppLocale } from "@/constants/locales";
import type { TranslationOrigin } from "@/constants/translations";
import type { RichTextDoc } from "@/typings/rich-text";
import { richTextInput } from "@/lib/rich-text/rich-text-input";

export const TRANSLATED_FIELDS = [
  "description",
  "offering",
  "seeking",
] as const;
export type TranslatedField = (typeof TRANSLATED_FIELDS)[number];

export const DESCRIPTION_MAX_CHARS = 5000;
export const SHORT_TEXT_MAX_CHARS = 1500;

export const translationViewInputSchema = z.object({
  entryId: z.uuid(),
  locale: z.enum(LOCALES),
});

export const saveTranslationInputSchema = z.object({
  entryId: z.uuid(),
  // Omitted means untouched; empty means "remove my translation and translate again".
  description: richTextInput(DESCRIPTION_MAX_CHARS).nullable().optional(),
  offering: z.string().max(SHORT_TEXT_MAX_CHARS).optional(),
  seeking: z.string().max(SHORT_TEXT_MAX_CHARS).optional(),
});

// Server function results must be provably JSON; RichTextDoc has `unknown` attrs, so it travels as this.
export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type SerializableDoc = { [key: string]: JsonValue };

// RichTextDoc was validated by parseRichText, so both directions are safe.
export function toSerializableDoc(doc: RichTextDoc) {
  return doc as unknown as SerializableDoc;
}

export function fromSerializableDoc(doc: SerializableDoc | null | undefined) {
  return (doc ?? null) as unknown as RichTextDoc | null;
}

export interface ITranslatedText {
  text: string;
  // Only the description is rich text: a validated RichTextDoc.
  doc: SerializableDoc | null;
  origin: TranslationOrigin;
}

// What the entry page shows when the visitor's language differs from the owner's.
export interface ITranslationView {
  entryId: string;
  locale: AppLocale;
  sourceLocale: AppLocale;
  texts: Partial<Record<TranslatedField, ITranslatedText>>;
  // Fields that have original text, translated or not.
  sourceFields: TranslatedField[];
  canEdit: boolean;
}
