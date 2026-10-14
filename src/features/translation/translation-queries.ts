import { mutationOptions, queryOptions } from "@tanstack/react-query";
import type { z } from "zod";

import type { AppLocale } from "@/constants/locales";

import type { saveTranslationInputSchema } from "./translation-schemas";
import {
  getEntryTranslation,
  saveEntryTranslation,
} from "./translation.functions";

export const ENTRY_TRANSLATION_KEY = "entry-translation";

// The locale and viewer are in the key: the owner flag is per viewer, the texts per language.
export function entryTranslationQueryOptions(
  entryId: string,
  locale: AppLocale,
  viewerId: string | null,
) {
  return queryOptions({
    queryKey: [ENTRY_TRANSLATION_KEY, entryId, locale, viewerId],
    queryFn: () => getEntryTranslation({ data: { entryId, locale } }),
    staleTime: 30_000,
  });
}

export function saveTranslationMutationOptions() {
  return mutationOptions({
    mutationFn: (data: z.input<typeof saveTranslationInputSchema>) =>
      saveEntryTranslation({ data }),
  });
}
