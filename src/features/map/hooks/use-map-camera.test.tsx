// @vitest-environment jsdom
import type { Map as MaplibreMap } from "maplibre-gl";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { IDirectoryEntry } from "@/features/directory/directory-schemas";

import { useMapCamera } from "./use-map-camera";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const PANEL = { top: 16, right: 16, bottom: 16, left: 400 };

function pin(slug: string, lng: number) {
  return { slug, lng, lat: 45.8 } as IDirectoryEntry;
}

let root: Root | null = null;

afterEach(() => {
  act(() => root?.unmount());
  root = null;
});

function Camera({ map, fitKey }: { map: MaplibreMap; fitKey: string }) {
  const pins = [pin("a", 15.9), pin("b", 16)];
  useMapCamera({
    getMap: () => map,
    ready: true,
    pins,
    allEntries: pins,
    focusSlug: null,
    fitKey,
    hasInitialViewport: false,
    duration: 0,
    getPadding: () => PANEL,
  });
  return null;
}

describe("useMapCamera", () => {
  it("fits new filters with the panel padding counted once", () => {
    const fitBounds = vi.fn();
    const map = { fitBounds } as unknown as MaplibreMap;
    root = createRoot(document.createElement("div"));
    act(() => root?.render(<Camera map={map} fitKey="a" />));
    // MapLibre adds the map's own padding (left there by a focus ease) unless told otherwise.
    expect(fitBounds.mock.calls[0][1]).toMatchObject({
      padding: PANEL,
      absolutePadding: true,
    });
  });
});
