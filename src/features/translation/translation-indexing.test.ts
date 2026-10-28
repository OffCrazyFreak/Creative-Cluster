import { describe, expect, it } from "vitest";

import type { ITranslationView } from "./translation-fields";
import { indexedLocales } from "./translation-indexing";

function view(translated: boolean): ITranslationView {
  return {
    entryId: "e",
    locale: "hr",
    sourceLocale: "en",
    sourceFields: ["description"],
    // Only the presence of a text matters here, not its other properties.
    texts: translated
      ? ({ description: { text: "Opis" } } as ITranslationView["texts"])
      : {},
    canEdit: false,
  };
}

describe("indexedLocales", () => {
  it("keeps an untranslated language out of the alternates", () => {
    expect(indexedLocales("en", { hr: view(false) })).toEqual(["en"]);
  });

  it("names a fully translated language", () => {
    expect(indexedLocales("en", { hr: view(true) })).toEqual(["hr", "en"]);
  });

  it("never names a language that was not looked up", () => {
    expect(indexedLocales("en", {})).toEqual(["en"]);
  });
});
