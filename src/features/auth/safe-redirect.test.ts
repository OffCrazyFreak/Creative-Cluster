import { describe, expect, it } from "vitest";

import { safeRedirect } from "./safe-redirect";

describe("safeRedirect", () => {
  it("keeps same-site paths with a query", () => {
    expect(safeRedirect("/admin/users")).toBe("/admin/users");
    expect(safeRedirect("/hr/account?x=1")).toBe("/hr/account?x=1");
  });

  it("rejects other origins and tricks that parse to one", () => {
    expect(safeRedirect(undefined)).toBeNull();
    expect(safeRedirect("https://evil.example")).toBeNull();
    expect(safeRedirect("//evil.example")).toBeNull();
    expect(safeRedirect("/\\evil.example")).toBeNull();
    expect(safeRedirect("/\t/evil.example")).toBeNull();
    expect(safeRedirect("/\n/evil.example")).toBeNull();
  });
});
