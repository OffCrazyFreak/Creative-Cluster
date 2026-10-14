import { describe, expect, it } from "vitest";

import { nextQuotaReset } from "./quota-reset";
import { buildGlossary } from "./glossary";
import { detectLocale, detectSourceLocale } from "./detect-locale";
import { validateTranslation } from "./validate-translation";

const EN =
  "We run workshops for young designers and publish a yearly magazine about local craft.";
const HR =
  "Vodimo radionice za mlade dizajnere i objavljujemo godišnji časopis o lokalnom obrtu.";

describe("validateTranslation", () => {
  it("accepts a faithful translation", () => {
    expect(validateTranslation([EN], [HR], "hr")).toBeNull();
  });

  it("rejects a different block count", () => {
    expect(validateTranslation([EN, EN], [HR], "hr")).toBe("block_count");
  });

  it("rejects an empty block", () => {
    expect(validateTranslation([EN, EN], [HR, "  "], "hr")).toBe("empty");
  });

  it("rejects length ratios outside 0.8 to 1.5", () => {
    expect(validateTranslation([EN], [HR.slice(0, 30)], "hr")).toBe(
      "length_ratio",
    );
    expect(validateTranslation([EN], [`${HR} ${HR}`], "hr")).toBe(
      "length_ratio",
    );
  });

  it("ignores the ratio for very short fields", () => {
    expect(
      validateTranslation(["Open call"], ["Otvoreni poziv za sve"], "hr"),
    ).toBeNull();
  });

  it("rejects a changed line count", () => {
    expect(validateTranslation([`${EN}\n\n${EN}`], [`${HR} ${HR}`], "hr")).toBe(
      "paragraphs",
    );
  });

  it("rejects dropped or altered URLs", () => {
    const withUrl = `${EN} https://example.org/a`;
    expect(validateTranslation([withUrl], [`${HR} Posjetite nas.`], "hr")).toBe(
      "urls",
    );
    expect(
      validateTranslation([withUrl], [`${HR} https://example.org/b`], "hr"),
    ).toBe("urls");
    expect(
      validateTranslation([withUrl], [`${HR} https://example.org/a`], "hr"),
    ).toBeNull();
  });

  it("rejects mismatched numbered tags", () => {
    const tagged =
      "We run <1>workshops</1> for young designers and publish a magazine.";
    expect(
      validateTranslation(
        [tagged],
        ["Vodimo radionice za mlade dizajnere i objavljujemo časopis."],
        "hr",
      ),
    ).toBe("tags");
    expect(
      validateTranslation(
        [tagged],
        ["Vodimo <1>radionice</1> za mlade dizajnere i objavljujemo časopis."],
        "hr",
      ),
    ).toBeNull();
  });

  it("rejects a short field echoed back unchanged, but allows glossary names", () => {
    expect(
      validateTranslation(
        ["Graphic designer wanted"],
        ["Graphic designer wanted"],
        "hr",
      ),
    ).toBe("unchanged");
    expect(
      validateTranslation(
        ["Studio Plava Zagreb"],
        ["Studio Plava Zagreb"],
        "hr",
        ["Studio Plava Zagreb"],
      ),
    ).toBeNull();
  });

  it("rejects text that is still in the source language", () => {
    expect(validateTranslation([EN], [`${EN} Join us today.`], "hr")).toBe(
      "language",
    );
  });
});

describe("language detection", () => {
  it("detects the two supported languages and skips short text", () => {
    expect(detectLocale(EN)).toBe("en");
    expect(detectLocale(HR)).toBe("hr");
    expect(detectLocale("Zagreb")).toBeNull();
    expect(detectSourceLocale("Zagreb", "hr")).toBe("hr");
  });
});

describe("buildGlossary", () => {
  it("keeps the entry name and the brand terms, once each", () => {
    const glossary = buildGlossary("Studio Plava");
    expect(glossary).toContain("Studio Plava");
    expect(glossary).toContain("Creative Cluster");
    expect(new Set(glossary).size).toBe(glossary.length);
  });
});

describe("nextQuotaReset", () => {
  it("is 00:05 UTC on the next day after the reset has passed", () => {
    expect(nextQuotaReset(new Date("2026-10-14T13:00:00Z")).toISOString()).toBe(
      "2026-10-15T00:05:00.000Z",
    );
    expect(nextQuotaReset(new Date("2026-10-14T00:10:00Z")).toISOString()).toBe(
      "2026-10-15T00:05:00.000Z",
    );
  });
});
