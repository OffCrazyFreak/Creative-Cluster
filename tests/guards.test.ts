import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { analyzeFile } from "./guards/analyze-file";

// Raw HTTP endpoints that do their own checks (auth library, signed webhooks, public assets).
const ALLOWED_SERVER_ROUTES = [
  "src/routes/api/auth/$.ts",
  "src/routes/api/webhooks/resend.ts",
  "src/routes/img/$id.$file.ts",
  "src/routes/sitemap[.]xml.ts",
  "src/routes/robots[.]txt.ts",
  "src/routes/healthz.ts",
  "src/routes/[.]well-known/security[.]txt.ts",
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const path = join(dir, item.name);
    if (item.isDirectory())
      return item.name === "paraglide" ? [] : sourceFiles(path);
    return /\.tsx?$/.test(item.name) && !item.name.endsWith(".gen.ts")
      ? [path]
      : [];
  });
}

function analyze(path: string) {
  return analyzeFile(path, readFileSync(path, "utf8"), ALLOWED_SERVER_ROUTES);
}

describe("server function guards", () => {
  it("every server function and server route in src is guarded", () => {
    expect(sourceFiles("src").flatMap(analyze)).toEqual([]);
  });

  it("flags unguarded, unvalidated and misplaced server functions", () => {
    const rules = analyze("tests/fixtures/unguarded-route.tsx").map(
      (v) => v.rule,
    );
    expect(rules).toEqual([
      "outside a *.functions.ts file",
      "first call must be .middleware([<guard>, ...])",
      "missing .inputValidator(...) before .handler(...)",
      "server route not in the allowlist",
    ]);
  });

  it("sees through aliases, double guards and look-alike guards", () => {
    const rules = analyze("tests/fixtures/sneaky.functions.ts").map(
      (v) => v.rule,
    );
    expect(rules).toEqual([
      "first call must be .middleware([<guard>, ...])",
      "exactly one guard per server function",
      "first call must be .middleware([<guard>, ...])",
    ]);
  });
});
