import { describe, expect, it } from "vitest";

import { dnz } from "@/sites/dnz";

import { fillContent } from "./fill-content";

describe("fillContent", () => {
  it("shows TODO config values as gaps and keeps real values", () => {
    const out = fillContent(
      "Seat: {{legal.seat}}. Site: {{siteName}}",
      dnz,
      "en",
    );
    expect(out).toContain("(gap:)");
    expect(out).toContain("association seat");
    expect(out).toContain("Registar inovatora DNŽ");
  });

  it("turns draft gaps into gap links", () => {
    expect(fillContent("a [[GAP: court]] b", dnz, "en")).toBe(
      "a [\\[\\[GAP: court\\]\\]](gap:) b",
    );
  });

  it("labels gaps in the page language", () => {
    expect(fillContent("{{legal.seat}}", dnz, "hr")).toContain(
      "sjedište udruge",
    );
  });

  it("leaves unknown tokens alone", () => {
    expect(fillContent("{{nope}}", dnz, "en")).toBe("{{nope}}");
  });
});
