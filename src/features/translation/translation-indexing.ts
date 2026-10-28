import { LOCALES, type AppLocale } from "@/constants/locales";

import type { ITranslationView, TranslatedField } from "./translation-fields";

// Fields that have original text but no stored translation.
export function missingFields(
  view: ITranslationView | null,
): TranslatedField[] {
  return view ? view.sourceFields.filter((field) => !view.texts[field]) : [];
}

// Translated pages stay indexed. A page that could not be translated shows another language's
// text under this language's URL, so it is kept out of the index until a translation exists.
export function needsNoindex(view: ITranslationView | null) {
  return missingFields(view).length > 0;
}

// Languages whose page is indexable: the owner's own and each one with every field translated.
export function indexedLocales(
  sourceLocale: string,
  views: Partial<Record<AppLocale, ITranslationView | null>>,
): AppLocale[] {
  return LOCALES.filter((locale) => {
    const view = views[locale];
    return (
      locale === sourceLocale || (view !== undefined && !needsNoindex(view))
    );
  });
}
