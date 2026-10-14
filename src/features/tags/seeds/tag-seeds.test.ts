import { describe, expect, it } from "vitest";

import { MAX_TAGS_PER_FIELD } from "@/constants/tags";

import { DNZ_TAG_SEED } from "./dnz-seed";
import { RPCC_TAG_SEED } from "./rpcc-seed";

const FORBIDDEN = /[–—→←]/;

describe.each([
  ["rpcc", RPCC_TAG_SEED],
  ["dnz", DNZ_TAG_SEED],
])("%s seed", (_site, seed) => {
  it("has unique slugs and parents that exist and come first", () => {
    const seen = new Set<string>();
    for (const item of seed) {
      expect(seen.has(item.slug), item.slug).toBe(false);
      if (item.parent) expect(seen.has(item.parent), item.slug).toBe(true);
      seen.add(item.slug);
    }
  });

  it("has labels in both languages and no dashes or arrows", () => {
    for (const item of seed) {
      expect(item.labelEn.trim()).not.toBe("");
      expect(item.labelHr.trim()).not.toBe("");
      expect(JSON.stringify(item)).not.toMatch(FORBIDDEN);
    }
  });
});

describe("rpcc seed", () => {
  const parents = RPCC_TAG_SEED.filter((t) =>
    RPCC_TAG_SEED.some((c) => c.parent === t.slug),
  );

  it("lists the 13 sectors of Regulation (EU) 2021/818 Article 2(1) with 3 to 5 children each", () => {
    expect(parents).toHaveLength(13);
    for (const parent of parents) {
      const children = RPCC_TAG_SEED.filter((c) => c.parent === parent.slug);
      expect(children.length, parent.slug).toBeGreaterThanOrEqual(3);
      expect(children.length, parent.slug).toBeLessThanOrEqual(5);
    }
  });

  it("keeps the five old domains as topic tags", () => {
    const slugs = RPCC_TAG_SEED.map((t) => t.slug);
    for (const slug of ["art", "crafts", "ecology", "science", "technology"]) {
      expect(slugs).toContain(slug);
    }
  });
});

describe("dnz seed", () => {
  it("has ESCO groups S1 to S8 with ESCO concept URIs", () => {
    const groups = DNZ_TAG_SEED.filter((t) => t.sourceUri);
    expect(groups.map((g) => g.sourceUri)).toEqual(
      Array.from(
        { length: 8 },
        (_, i) => `http://data.europa.eu/esco/skill/S${i + 1}`,
      ),
    );
  });

  it("adds about 40 curated skills under those groups", () => {
    const skills = DNZ_TAG_SEED.filter((t) => t.parent);
    expect(skills.length).toBeGreaterThanOrEqual(35);
    expect(skills.length).toBeLessThanOrEqual(45);
  });
});

it("MAX_TAGS_PER_FIELD stays 5 as the spec says", () => {
  expect(MAX_TAGS_PER_FIELD).toBe(5);
});
