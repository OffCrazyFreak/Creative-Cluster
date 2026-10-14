import { describe, expect, it } from "vitest";

import { isHttpUrl, normalizeHttpUrl } from "./http-url";

describe("isHttpUrl", () => {
  it("accepts http and https only", () => {
    expect(isHttpUrl("https://example.org/a?b=1")).toBe(true);
    expect(isHttpUrl("http://example.org")).toBe(true);
    for (const bad of [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      "java\nscript:alert(1)",
      " javascript:alert(1)",
      "data:text/html;base64,PHNjcmlwdD4=",
      "mailto:a@b.c",
      "ftp://example.org",
      "//example.org",
      "/relative",
      "",
      null,
      42,
    ]) {
      expect(isHttpUrl(bad)).toBe(false);
    }
  });
});

describe("normalizeHttpUrl", () => {
  it("adds https to bare domains and rejects other schemes", () => {
    expect(normalizeHttpUrl(" example.org/x ")).toBe("https://example.org/x");
    expect(normalizeHttpUrl("http://example.org")).toBe("http://example.org");
    expect(normalizeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeHttpUrl("   ")).toBeNull();
  });

  it("adds https to a bare host with a port", () => {
    expect(normalizeHttpUrl("example.org:8080/x")).toBe(
      "https://example.org:8080/x",
    );
  });
});
