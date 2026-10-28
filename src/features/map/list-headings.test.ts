import { describe, expect, it } from "vitest";

import { listGroups } from "./list-headings";

const labels = {
  onMap: (n: number) => `map ${n}`,
  elsewhere: (n: number) => `else ${n}`,
};

describe("listGroups", () => {
  it("splits into on-map and elsewhere when the map shows some entries", () => {
    expect(listGroups({ onMap: ["a", "b"], elsewhere: ["c"], labels })).toEqual(
      [
        { id: "on-map", heading: "map 2", entries: ["a", "b"] },
        { id: "elsewhere", heading: "else 1", entries: ["c"] },
      ],
    );
  });

  it("adds no headings when every entry is on the map", () => {
    expect(listGroups({ onMap: ["a", "b"], elsewhere: [], labels })).toEqual([
      { id: "all", heading: null, entries: ["a", "b"] },
    ]);
  });

  it("adds no headings when none is on the map", () => {
    expect(listGroups({ onMap: [], elsewhere: ["c"], labels })).toEqual([
      { id: "all", heading: null, entries: ["c"] },
    ]);
  });
});
