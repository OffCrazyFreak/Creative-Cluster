import { describe, expect, it } from "vitest";

import { GRAPH_NODE, layoutGraph, uniquePairs } from "./graph-layout";

const edges = [
  { source: "c", target: "a" },
  { source: "c", target: "b" },
  { source: "c", target: "d" },
  { source: "a", target: "b" },
];

describe("layoutGraph", () => {
  it("returns the same positions for the same seed", () => {
    const first = layoutGraph("seed", "c", ["a", "b", "d"], edges);
    const second = layoutGraph("seed", "c", ["a", "b", "d"], edges);
    expect([...second]).toEqual([...first]);
  });

  it("keeps the centre fixed at the origin", () => {
    const center = layoutGraph("seed", "c", ["a", "b", "d"], edges).get("c");
    expect(center).toEqual({
      x: -GRAPH_NODE.width / 2,
      y: -GRAPH_NODE.height / 2,
    });
  });

  it("keeps nodes from overlapping", () => {
    const points = [
      ...layoutGraph("seed", "c", ["a", "b", "d"], edges).values(),
    ];
    for (const [i, p] of points.entries())
      for (const q of points.slice(i + 1))
        expect(
          Math.abs(p.x - q.x) >= GRAPH_NODE.width ||
            Math.abs(p.y - q.y) >= GRAPH_NODE.height,
        ).toBe(true);
  });

  it("separates a full set of fifteen partners", () => {
    const ids = Array.from({ length: 15 }, (_, i) => `p${i}`);
    const links = ids.map((id) => ({ source: "c", target: id }));
    const points = [...layoutGraph("full", "c", ids, links).values()];
    for (const [i, p] of points.entries())
      for (const q of points.slice(i + 1))
        expect(
          Math.abs(p.x - q.x) >= GRAPH_NODE.width ||
            Math.abs(p.y - q.y) >= GRAPH_NODE.height,
        ).toBe(true);
  });
});

describe("uniquePairs", () => {
  it("draws one edge per pair, whatever the direction or number of kinds", () => {
    const edges = uniquePairs([
      { id: "l1", fromId: "a", toId: "b" },
      { id: "l2", fromId: "b", toId: "a" },
      { id: "l3", fromId: "a", toId: "b" },
      { id: "l4", fromId: "a", toId: "c" },
    ]);
    expect(edges).toEqual([
      { id: "l1", source: "a", target: "b" },
      { id: "l4", source: "a", target: "c" },
    ]);
  });
});
