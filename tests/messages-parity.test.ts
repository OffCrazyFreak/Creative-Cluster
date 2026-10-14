import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = join(process.cwd(), "messages");

function keys(area: string, locale: string): string[] {
  const file = join(root, area, `${locale}.json`);
  return Object.keys(JSON.parse(readFileSync(file, "utf8")) as object)
    .filter((key) => key !== "$schema")
    .sort();
}

// Stands in for Paraglide's missing-translation build check until it ships in a release.
describe("message files", () => {
  for (const area of readdirSync(root)) {
    it(`${area} has the same keys in en and hr`, () => {
      expect(keys(area, "hr")).toEqual(keys(area, "en"));
    });
  }
});
