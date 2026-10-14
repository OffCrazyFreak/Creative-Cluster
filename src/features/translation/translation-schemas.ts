import { z } from "zod";

import { LOCALES } from "@/constants/locales";
import { richTextInput } from "@/lib/rich-text/rich-text-input";

import {
  DESCRIPTION_MAX_CHARS,
  SHORT_TEXT_MAX_CHARS,
} from "./translation-fields";

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
