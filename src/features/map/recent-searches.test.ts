// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import {
  addRecentSearch,
  clearRecentSearches,
  readRecentSearches,
} from "./recent-searches";

beforeEach(() => localStorage.clear());

describe("recent searches", () => {
  it("keeps the newest first, without duplicates, up to five", () => {
    for (const query of ["one", "two", "three", "four", "five", "six"])
      addRecentSearch(query);
    addRecentSearch(" TWO ");
    expect(readRecentSearches()).toEqual([
      "TWO",
      "six",
      "five",
      "four",
      "three",
    ]);
  });

  it("ignores blank queries and clears", () => {
    addRecentSearch("   ");
    expect(readRecentSearches()).toEqual([]);
    addRecentSearch("zagreb");
    clearRecentSearches();
    expect(readRecentSearches()).toEqual([]);
  });

  it("survives unreadable storage", () => {
    localStorage.setItem("cc-map-recent-searches", "{not json");
    expect(readRecentSearches()).toEqual([]);
    localStorage.setItem("cc-map-recent-searches", '["ok", 3]');
    expect(readRecentSearches()).toEqual(["ok"]);
  });
});
