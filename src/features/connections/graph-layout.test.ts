import { describe, expect, it } from "vitest";

import { GRAPH_NODE, layoutGraph } from "./graph-layout";

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
});
