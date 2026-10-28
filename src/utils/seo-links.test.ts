import { describe, expect, it } from "vitest";

import { indexableLinks } from "./seo-links";

function hrefLangs(links: ReturnType<typeof indexableLinks>) {
  return links.flatMap((link) => (link.hrefLang ? [link.hrefLang] : []));
}

describe("indexableLinks", () => {
  it("lists every language by default", () => {
    expect(hrefLangs(indexableLinks("/e/x"))).toEqual([
      "hr",
      "en",
      "x-default",
    ]);
  });

  it("leaves out languages whose page is noindex, x-default included", () => {
    const links = indexableLinks("/e/x", ["hr"]);
    expect(hrefLangs(links)).toEqual(["hr", "x-default"]);
    const fallback = links.find((link) => link.hrefLang === "x-default");
    const hr = links.find((link) => link.hrefLang === "hr");
    expect(fallback?.href).toBe(hr?.href);
  });
});
