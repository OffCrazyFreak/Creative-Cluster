import { describe, expect, it } from "vitest";

import { compareForStack, topOfStack } from "./entry-rank";

const LOGO = { id: "i", hash: "h" };

function entry(name: string, logo = false, opps = 0) {
  return { name, logo: logo ? LOGO : null, opps };
}

describe("topOfStack", () => {
  it("puts entries with logos first, then live opportunities, then by name", () => {
    const entries = [
      entry("Atelier"),
      entry("Zeta", false, 2),
      entry("Mono", true),
      entry("Beta", true, 1),
      entry("Alpha", false, 3),
    ];
    expect(topOfStack(entries, 5).map((item) => item.name)).toEqual([
      "Beta",
      "Mono",
      "Alpha",
      "Zeta",
      "Atelier",
    ]);
  });

  it("shows at most the requested number and leaves the input alone", () => {
    const entries = [entry("C"), entry("B"), entry("A")];
    expect(topOfStack(entries, 2).map((item) => item.name)).toEqual(["A", "B"]);
    expect(entries.map((item) => item.name)).toEqual(["C", "B", "A"]);
  });

  it("counts any number of opportunities the same", () => {
    expect(
      compareForStack(entry("A", false, 1), entry("B", false, 9)),
    ).toBeLessThan(0);
  });
});
