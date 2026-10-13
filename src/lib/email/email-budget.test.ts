import { describe, expect, it } from "vitest";

import { maySend, startOfNextUtcDay } from "./email-budget.server";

describe("email daily cap", () => {
  it("lets urgent mail use the whole cap", () => {
    expect(maySend(1, 99, 100)).toBe(true);
    expect(maySend(1, 100, 100)).toBe(false);
  });

  it("defers normal mail at 80 percent", () => {
    expect(maySend(5, 79, 100)).toBe(true);
    expect(maySend(5, 80, 100)).toBe(false);
  });

  it("defers to the start of the next UTC day", () => {
    const next = startOfNextUtcDay(new Date("2026-10-13T23:59:00Z"));
    expect(next.toISOString()).toBe("2026-10-14T00:00:00.000Z");
  });
});
