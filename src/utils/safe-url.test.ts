import { describe, expect, it } from "vitest";

import { safeHttpUrl } from "./safe-url";

describe("safeHttpUrl", () => {
  it("keeps http(s) links", () => {
    expect(safeHttpUrl("https://example.org/a")).toBe("https://example.org/a");
  });

  it("drops script, data and malformed values", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:text/html,x")).toBeNull();
    expect(safeHttpUrl("not a url")).toBeNull();
    expect(safeHttpUrl(null)).toBeNull();
  });
});
