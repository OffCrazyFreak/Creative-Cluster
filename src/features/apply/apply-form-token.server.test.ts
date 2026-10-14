import { describe, expect, it, vi } from "vitest";

vi.mock("@/env.server", () => ({
  env: { PSEUDONYM_SECRET: "test-secret-test-secret-test-secret-1" },
}));
const { checkFormToken, issueFormToken } =
  await import("./apply-form-token.server");

describe("apply form token", () => {
  const start = 1_800_000_000_000;

  it("is too fast before the minimum and fine after it", () => {
    const token = issueFormToken(start);
    expect(checkFormToken(token, start + 1_000)).toBe("too_fast");
    expect(checkFormToken(token, start + 6_000)).toBe("ok");
  });

  it("rejects a forged start time, a missing signature and an old token", () => {
    const token = issueFormToken(start);
    const [, signature] = token.split(".");
    expect(
      checkFormToken(`${start - 600_000}.${signature}`, start + 6_000),
    ).toBe("invalid");
    expect(checkFormToken(String(start), start + 6_000)).toBe("invalid");
    expect(checkFormToken(token, start + 25 * 3600 * 1000)).toBe("invalid");
    expect(checkFormToken(token, start - 1)).toBe("invalid");
  });
});
