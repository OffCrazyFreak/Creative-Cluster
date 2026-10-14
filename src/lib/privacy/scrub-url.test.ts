import { describe, expect, it } from "vitest";

import { scrubPathTokens, scrubUrl } from "./scrub-url";

describe("scrubUrl", () => {
  it("drops the query string and fragment", () => {
    expect(scrubUrl("https://x.test/directory?tag=a&token=zzz#top")).toBe(
      "https://x.test/directory",
    );
  });

  it("hides token path segments, also under a locale prefix", () => {
    expect(scrubUrl("https://x.test/claim/abc123")).toBe(
      "https://x.test/claim/[token]",
    );
    expect(scrubUrl("/hr/reset-password/abc?x=1")).toBe(
      "/hr/reset-password/[token]",
    );
  });

  it("leaves ordinary paths alone", () => {
    expect(scrubUrl("/e/some-entry")).toBe("/e/some-entry");
    expect(scrubPathTokens("/claim/q")).toBe("/claim/[token]");
  });
});
