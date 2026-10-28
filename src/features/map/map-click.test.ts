import type { Map as MaplibreMap } from "maplibre-gl";
import { describe, expect, it, vi } from "vitest";

import { PERSON_MAX_FIT_ZOOM } from "./cluster-leaves";
import { openStack } from "./map-click";

const COVERED = { top: 0, right: 0, bottom: 300, left: 0 };

function leaf(slug: string, lng: number, person = false) {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [lng, 45.8] },
    properties: { slug, person },
  };
}

function fakeMap(leaves: ReturnType<typeof leaf>[], zoom = 10, fitZoom = 14) {
  const fitBounds =
    vi.fn<(bounds: unknown, options: { maxZoom: number }) => void>();
  const easeTo = vi.fn<(options: { zoom: number }) => void>();
  const map = {
    getSource: () => ({
      getClusterLeaves: () => Promise.resolve(leaves),
      getClusterExpansionZoom: () => Promise.resolve(zoom + 2),
    }),
    getZoom: () => zoom,
    getMaxZoom: () => 20,
    getCanvas: () => ({ clientWidth: 390, clientHeight: 800 }),
    cameraForBounds: () => ({ zoom: fitZoom }),
    fitBounds,
    easeTo,
  } as unknown as MaplibreMap;
  return { map, fitBounds, easeTo };
}

async function open(map: MaplibreMap) {
  const onListSlugs = vi.fn();
  await openStack({
    map,
    clusterId: 1,
    covered: COVERED,
    duration: 0,
    onListSlugs,
  });
  return onListSlugs;
}

describe("openStack", () => {
  it("fits exactly the stack's entries, clear of the sheet", async () => {
    const { map, fitBounds } = fakeMap([leaf("a", 15.9), leaf("b", 16)]);
    await open(map);
    expect(fitBounds).toHaveBeenCalledWith(
      [
        [15.9, 45.8],
        [16, 45.8],
      ],
      {
        maxZoom: 20,
        duration: 0,
        // Replaces the map's own padding, which already holds the panel.
        absolutePadding: true,
        padding: { top: 64, right: 64, bottom: 364, left: 64 },
      },
    );
  });

  it("zooms in to the split when the fit would not get closer", async () => {
    const leaves = [leaf("a", 15.9), leaf("b", 16)];
    const { map, fitBounds, easeTo } = fakeMap(leaves, 10, 9);
    await open(map);
    expect(fitBounds).not.toHaveBeenCalled();
    expect(easeTo.mock.calls[0][0].zoom).toBe(12);
  });

  it("caps the zoom when a person is among the entries", async () => {
    const { map, fitBounds } = fakeMap([leaf("a", 15.9), leaf("b", 16, true)]);
    await open(map);
    expect(fitBounds.mock.calls[0][1].maxZoom).toBe(PERSON_MAX_FIT_ZOOM);
  });

  it("lists a person's stack instead of zooming past the cap", async () => {
    const leaves = [leaf("a", 15.9), leaf("b", 16, true)];
    const { map, fitBounds } = fakeMap(leaves, PERSON_MAX_FIT_ZOOM);
    expect(await open(map)).toHaveBeenCalledWith(["a", "b"]);
    expect(fitBounds).not.toHaveBeenCalled();
  });

  it("lists entries on one spot, which no zoom can split", async () => {
    const { map, fitBounds } = fakeMap([leaf("a", 15.9), leaf("b", 15.9)]);
    expect(await open(map)).toHaveBeenCalledWith(["a", "b"]);
    expect(fitBounds).not.toHaveBeenCalled();
  });
});
