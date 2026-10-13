import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { SECURITY_HEADERS } from "@/server/security-headers";

describe("security headers", () => {
  it("netlify.toml sends the same headers for static files", () => {
    const toml = readFileSync("netlify.toml", "utf8");
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(toml).toContain(`${name} = "${value}"`);
    }
  });
});
