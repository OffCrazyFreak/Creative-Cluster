import { describe, expect, it } from "vitest";

import { backoffMs } from "./drain-jobs.server";

describe("job backoff", () => {
  it("grows by a factor of four per attempt", () => {
    expect(backoffMs(1)).toBe(30_000);
    expect(backoffMs(2)).toBe(120_000);
    expect(backoffMs(3)).toBe(480_000);
  });
});
