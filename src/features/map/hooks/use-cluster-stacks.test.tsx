// @vitest-environment jsdom
import type { Map as MaplibreMap } from "maplibre-gl";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import type { IDirectoryEntry } from "@/features/directory/directory-schemas";

import { type IClusterStack, useClusterStacks } from "./use-cluster-stacks";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root | null = null;
afterEach(() => act(() => root?.unmount()));

function cluster(id: number) {
  return {
    properties: { cluster_id: id, point_count: 2 },
    geometry: { type: "Point", coordinates: [16, 45] },
  };
}

// Just the calls the hook makes; the features shown change with `features`.
function fakeMap() {
  const state = { features: [cluster(1)] };
  const map = {
    getSource: () => ({ getClusterLeaves: () => Promise.resolve([]) }),
    getBounds: () => ({ contains: () => true }),
    querySourceFeatures: () => state.features,
    on: () => undefined,
    off: () => undefined,
  } as unknown as MaplibreMap;
  return { map, state };
}

describe("useClusterStacks", () => {
  it("clears the stacks when new pins leave no cluster in view", async () => {
    const { map, state } = fakeMap();
    const bySlug = new Map<string, IDirectoryEntry>();
    const result = { current: [] as IClusterStack[] };
    function Probe({ data }: { data: number }) {
      result.current = useClusterStacks(map, bySlug, data);
      return null;
    }
    root = createRoot(document.createElement("div"));
    await act(() => Promise.resolve(root?.render(<Probe data={1} />)));
    expect(result.current).toHaveLength(1);

    state.features = [];
    await act(() => Promise.resolve(root?.render(<Probe data={2} />)));
    expect(result.current).toHaveLength(0);
  });
});
