import { describe, expect, it } from "vitest";

import {
  canRenew,
  deadlineEnd,
  isDeadlineAllowed,
  lastOpenDay,
  periodEnd,
} from "./opportunity-expiry";

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

  it("never runs past the end of day 180", () => {
    expect(periodEnd({ start: NOW, deadline: "2027-12-31" })).toEqual(
      deadlineEnd("2027-04-12"),
    );
  });

  it("keeps the last allowed deadline open through its whole day", () => {
    expect(periodEnd({ start: NOW, deadline: "2027-04-12" })).toEqual(
      deadlineEnd("2027-04-12"),
    );
  });
});

describe("lastOpenDay", () => {
  it("names the deadline, not the day after it", () => {
    expect(lastOpenDay(deadlineEnd("2026-11-01")).toISOString()).toMatch(
      /^2026-11-01T/,
    );
  });
});

describe("isDeadlineAllowed", () => {
  it("accepts today and up to 180 days ahead only", () => {
    expect(isDeadlineAllowed("2026-10-14", NOW)).toBe(true);
    expect(isDeadlineAllowed("2026-10-13", NOW)).toBe(false);
    expect(isDeadlineAllowed("2027-04-12", NOW)).toBe(true);
    expect(isDeadlineAllowed("2027-04-13", NOW)).toBe(false);
  });

  it("rejects dates that match the pattern but do not exist", () => {
    expect(isDeadlineAllowed("2026-10-45", NOW)).toBe(false);
    expect(isDeadlineAllowed("2026-13-01", NOW)).toBe(false);
    expect(isDeadlineAllowed("2027-02-30", NOW)).toBe(false);
  });
});

describe("canRenew", () => {
  const base = { status: "published", renewals: 0 };

  it("opens in the last 8 days and after expiry", () => {
    expect(canRenew({ ...base, expiresAt: day(9) }, NOW)).toBe(false);
    expect(canRenew({ ...base, expiresAt: day(8) }, NOW)).toBe(true);
    expect(canRenew({ ...base, expiresAt: day(-3) }, NOW)).toBe(true);
  });

  it("stops after 3 renewals and for posts that are not published", () => {
    expect(canRenew({ ...base, renewals: 3, expiresAt: day(2) }, NOW)).toBe(
      false,
    );
    expect(
      canRenew({ status: "closed", renewals: 0, expiresAt: day(2) }, NOW),
    ).toBe(false);
  });
});
