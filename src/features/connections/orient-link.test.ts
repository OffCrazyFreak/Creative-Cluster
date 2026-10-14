import { describe, expect, it } from "vitest";

import { orientLink } from "./orient-link";

describe("orientLink", () => {
  it("orders symmetric kinds by id whoever proposes", () => {
    expect(orientLink("collaborated", "b", "a", "outgoing")).toEqual({
      fromId: "a",
      toId: "b",
      symmetric: true,
    });
    expect(orientLink("eu_partner", "a", "b", "incoming").fromId).toBe("a");
  });

  it("keeps the proposer's direction for directed kinds", () => {
    expect(orientLink("mentor", "b", "a", "outgoing")).toEqual({
      fromId: "b",
      toId: "a",
      symmetric: false,
    });
    expect(orientLink("mentor", "b", "a", "incoming").fromId).toBe("a");
  });
});
