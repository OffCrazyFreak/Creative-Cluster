import type { Map as MaplibreMap } from "maplibre-gl";
import { describe, expect, it } from "vitest";

import { CLUSTER_LAYER_ID, POINT_LAYER_ID } from "./map-layers";
import { findSelectedFrame, sameFrame } from "./selected-frame";

const ENTRY = { lat: 45.81, lng: 15.97 };

function fakeMap({
  singles = [] as string[],
  clusters = [] as { id: number; slugs: string[] }[],
  styleLoaded = true,
}) {
  const clusterFeatures = clusters.map(({ id }) => ({
    geometry: { type: "Point", coordinates: [16, 45.8] },
    properties: { cluster_id: id },
  }));
  return {
    getLayer: () => (styleLoaded ? {} : undefined),
    queryRenderedFeatures: ({ layers }: { layers: string[] }) => {
      if (layers[0] === POINT_LAYER_ID)
        return singles.map((slug) => ({ properties: { slug } }));
      return layers[0] === CLUSTER_LAYER_ID ? clusterFeatures : [];
    },
    getSource: () => ({
      getClusterLeaves: (id: number) =>
        Promise.resolve(
          (clusters.find((cluster) => cluster.id === id)?.slugs ?? []).map(
            (slug) => ({ properties: { slug } }),
          ),
        ),
    }),
  } as unknown as MaplibreMap;
}

describe("findSelectedFrame", () => {
  it("frames the entry's own tile when it is drawn alone", async () => {
    const map = fakeMap({ singles: ["studio"] });
    expect(await findSelectedFrame(map, "studio", ENTRY)).toEqual({
      ...ENTRY,
      wide: false,
    });
  });

  it("moves to the cluster the entry merged into after zooming out", async () => {
    const map = fakeMap({
      clusters: [
        { id: 1, slugs: ["lab"] },
        { id: 2, slugs: ["hub", "studio"] },
      ],
    });
    expect(await findSelectedFrame(map, "studio", ENTRY)).toEqual({
      lat: 45.8,
      lng: 16,
      wide: true,
    });
  });

  it("waits without querying while a reloading style has no pin layers", async () => {
    const map = fakeMap({ singles: ["studio"], styleLoaded: false });
    expect(await findSelectedFrame(map, "studio", ENTRY)).toBeNull();
  });

  it("shows no frame while neither the entry nor its cluster is on screen", async () => {
    expect(await findSelectedFrame(fakeMap({}), "studio", ENTRY)).toBeNull();
  });
});

describe("sameFrame", () => {
  it("treats an unchanged frame as the same, so the overlay does not redraw", () => {
    expect(sameFrame({ ...ENTRY, wide: true }, { ...ENTRY, wide: true })).toBe(
      true,
    );
    expect(sameFrame({ ...ENTRY, wide: true }, { ...ENTRY, wide: false })).toBe(
      false,
    );
  });
});
