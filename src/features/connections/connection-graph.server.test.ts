import { describe, expect, it, vi } from "vitest";

vi.mock("@/db/client.server", () => ({ db: {} }));
const { uniquePairs } = await import("./connection-graph.server");

describe("uniquePairs", () => {
  it("draws one edge for a pair linked in both directions", () => {
    const edges = uniquePairs([
      { id: "l1", fromId: "a", toId: "b" },
      { id: "l2", fromId: "b", toId: "a" },
      { id: "l3", fromId: "a", toId: "c" },
    ]);
    expect(edges).toEqual([
      { id: "l1", source: "a", target: "b" },
      { id: "l3", source: "a", target: "c" },
    ]);
  });
});
