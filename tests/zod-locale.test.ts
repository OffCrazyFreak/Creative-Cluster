import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";

import "@/lib/zod/zod-locale";
import { overwriteGetLocale } from "@/paraglide/runtime";

afterEach(() => overwriteGetLocale(() => "en"));

describe("zod locale fallback", () => {
  function issue(locale: "en" | "hr") {
    overwriteGetLocale(() => locale);
    const result = z.string().min(3).safeParse("a");
    return result.success ? "" : result.error.issues[0]?.message;
  }

  it("follows the request language", () => {
    expect(issue("en")).not.toEqual(issue("hr"));
    expect(issue("hr")).toMatch(/^Premalo/);
  });
});
