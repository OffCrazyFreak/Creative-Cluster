import { useEffect, useRef } from "react";
import type { Map as MaplibreMap } from "maplibre-gl";

import type { IDirectoryEntry } from "@/features/directory/directory-schemas";

import { boundsOf } from "../map-geojson";
import type { IMapPadding } from "../map-padding";

const MAX_FIT_ZOOM = 12;
const FOCUS_ZOOM = 10;

interface IUseMapCameraInput {
  getMap: () => MaplibreMap | undefined;
  ready: boolean;
  pins: IDirectoryEntry[];
  allEntries: IDirectoryEntry[];
  focusSlug: string | null;
  fitKey: string;
  // True when the URL carried a viewport: that view wins over the first fit and focus.
  hasInitialViewport: boolean;
  duration: number;
  getPadding: () => IMapPadding;
}

// Camera moves driven by the app: refit when the filters change, centre on the open entry.
export function useMapCamera({
  getMap,
  ready,
  pins,
  allEntries,
  focusSlug,
  fitKey,
  hasInitialViewport,
  duration,
  getPadding,
}: IUseMapCameraInput) {
  // Remounts toggle `ready` again; these refs make sure only a real change moves the camera.
  const lastFitKey = useRef<string | null>(null);
  const lastFocus = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const map = getMap();
    if (!ready || !map) return;
    const first = lastFitKey.current === null;
    if (lastFitKey.current === fitKey) return;
    lastFitKey.current = fitKey;
    // A shared link with a viewport keeps that viewport instead of fitting on first load.
    if (first && hasInitialViewport) return;
    const bounds = boundsOf(pins);
    if (!bounds) return;
    const padding = getPadding();
    if (bounds[0][0] === bounds[1][0] && bounds[0][1] === bounds[1][1])
      map.easeTo({ center: bounds[0], zoom: FOCUS_ZOOM, padding, duration });
    else map.fitBounds(bounds, { padding, maxZoom: MAX_FIT_ZOOM, duration });
    // Only a filter change refits; panning and result narrowing never fight the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, fitKey]);

  useEffect(() => {
    const map = getMap();
    if (!ready || !map) return;
    const first = lastFocus.current === undefined;
    if (lastFocus.current === focusSlug) return;
    lastFocus.current = focusSlug;
    if (!focusSlug || (first && hasInitialViewport)) return;
    const entry = allEntries.find((item) => item.slug === focusSlug);
    if (!entry || entry.lat === null || entry.lng === null) return;
    map.easeTo({
      center: [entry.lng, entry.lat],
      zoom: Math.max(map.getZoom(), FOCUS_ZOOM),
      padding: getPadding(),
      duration,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, focusSlug]);
}
