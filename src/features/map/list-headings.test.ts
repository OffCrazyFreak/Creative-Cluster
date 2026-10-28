import { describe, expect, it } from "vitest";

import { listGroups } from "./list-headings";

const labels = {
  saved: (n: number) => `saved ${n}`,
  onMap: (n: number) => `map ${n}`,
  elsewhere: (n: number) => `else ${n}`,
  others: (n: number) => `others ${n}`,
};

describe("listGroups", () => {
  it("splits into on-map and elsewhere when the map shows some entries", () => {
    expect(
      listGroups({ saved: [], onMap: ["a", "b"], elsewhere: ["c"], labels }),
    ).toEqual([
      { id: "on-map", heading: "map 2", entries: ["a", "b"] },
      { id: "elsewhere", heading: "else 1", entries: ["c"] },
    ]);
  });

  it("adds no headings when every entry is on the map", () => {
    expect(
      listGroups({ saved: [], onMap: ["a", "b"], elsewhere: [], labels }),
    ).toEqual([{ id: "all", heading: null, entries: ["a", "b"] }]);
  });

  it("adds no headings when none is on the map", () => {
    expect(
      listGroups({ saved: [], onMap: [], elsewhere: ["c"], labels }),
    ).toEqual([{ id: "all", heading: null, entries: ["c"] }]);
  });

  it("puts saved entries first and names the rest", () => {
    expect(
      listGroups({ saved: ["s"], onMap: ["a", "b"], elsewhere: [], labels }),
    ).toEqual([
      { id: "saved", heading: "saved 1", entries: ["s"] },
      { id: "others", heading: "others 2", entries: ["a", "b"] },
    ]);
  });

  it("keeps the on-map and elsewhere split below the saved group", () => {
    expect(
      listGroups({ saved: ["s", "t"], onMap: ["a"], elsewhere: ["c"], labels }),
    ).toEqual([
      { id: "saved", heading: "saved 2", entries: ["s", "t"] },
      { id: "on-map", heading: "map 1", entries: ["a"] },
      { id: "elsewhere", heading: "else 1", entries: ["c"] },
    ]);
  });

  it("shows only the saved group when every entry is saved", () => {
    expect(
      listGroups({ saved: ["s"], onMap: [], elsewhere: [], labels }),
    ).toEqual([{ id: "saved", heading: "saved 1", entries: ["s"] }]);
  });
});
