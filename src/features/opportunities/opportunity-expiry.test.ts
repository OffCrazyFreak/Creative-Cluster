import { describe, expect, it } from "vitest";

import { deadlineEnd, periodEnd } from "./opportunity-expiry";

const NOW = new Date("2026-10-14T10:00:00Z");
function day(n: number) {
  return new Date(NOW.getTime() + n * 86_400_000);
}

describe("periodEnd", () => {
  it("runs 60 days without a deadline", () => {
    expect(periodEnd({ start: NOW, deadline: null })).toEqual(day(60));
  });

  it("ends one day after the deadline", () => {
    expect(periodEnd({ start: NOW, deadline: "2026-11-01" })).toEqual(
      deadlineEnd("2026-11-01"),
    );
    expect(deadlineEnd("2026-11-01").toISOString()).toBe(
      "2026-11-02T00:00:00.000Z",
    );
  });

  it("never runs past 180 days", () => {
    expect(periodEnd({ start: NOW, deadline: "2027-12-31" })).toEqual(day(180));
  });
});
