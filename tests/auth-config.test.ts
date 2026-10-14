import { describe, expect, it, vi } from "vitest";

vi.mock("@/db/client.server", () => ({ db: {} }));

const { auth } = await import("@/lib/auth/auth.server");

describe("auth config", () => {
  it("never serves impersonation", () => {
    expect(auth.options.disabledPaths).toEqual(
      expect.arrayContaining([
        "/admin/impersonate-user",
        "/admin/stop-impersonating",
      ]),
    );
  });

  it("is invite only for passwords", () => {
    expect(auth.options.emailAndPassword?.disableSignUp).toBe(true);
  });
});
