import { describe, expect, it } from "vitest";

import {
  emptyProposeValues,
  proposeFormSchema,
  toProposeInput,
} from "./propose-form-schema";

const base = { ...emptyProposeValues("entry-id"), targetId: "target-id" };

function issuesOf(values: Partial<typeof base>) {
  const result = proposeFormSchema.safeParse({ ...base, ...values });
  return result.success
    ? {}
    : Object.fromEntries(
        result.error.issues.map((i) => [i.path[0], i.message]),
      );
}

describe("proposeFormSchema", () => {
  it("accepts a plain proposal", () => {
    expect(issuesOf({})).toEqual({});
  });

  it("needs a picked partner unless the partner is outside", () => {
    expect(issuesOf({ targetId: "" })).toHaveProperty("targetId");
  });

  it("requires name, website and evidence for an outside partner", () => {
    expect(Object.keys(issuesOf({ outside: true }))).toEqual(
      expect.arrayContaining(["outsideName", "outsideWebsite", "evidenceUrl"]),
    );
  });

  it("ignores whitespace-only optional fields", () => {
    expect(issuesOf({ year: "  ", evidenceUrl: " " })).toEqual({});
  });

  it("keeps years inside the server range and ordered", () => {
    expect(issuesOf({ year: "1850" })).toHaveProperty("year");
    expect(issuesOf({ year: "2020", endYear: "12" })).toHaveProperty("endYear");
    expect(issuesOf({ year: "2020", endYear: "2019" })).toHaveProperty(
      "endYear",
    );
    expect(issuesOf({ endYear: "2019" })).toHaveProperty("endYear");
  });

  it("reports too long text next to other errors", () => {
    const issues = issuesOf({ note: "x".repeat(501), targetId: "" });
    expect(issues).toHaveProperty("note");
    expect(issues).toHaveProperty("targetId");
  });
});

describe("toProposeInput", () => {
  it("trims values and turns blanks into null", () => {
    const input = toProposeInput({
      ...base,
      year: " 2024 ",
      endYear: " ",
      project: "  ",
      evidenceUrl: " https://example.org/x ",
    });
    expect(input).toMatchObject({
      year: 2024,
      endYear: null,
      project: null,
      evidenceUrl: "https://example.org/x",
    });
  });
});
