import type { Map as MaplibreMap } from "maplibre-gl";
import { useEffect, useRef } from "react";

import type { IMapPadding } from "../map-padding";
import { useGeolocation } from "./use-geolocation";

// People's pins are offset about a kilometre, so a locate never zooms in far enough to make
// an offset pin look exact.
const LOCATE_ZOOM = 13;

interface IUseNearMeInput {
  getMap: () => MaplibreMap | undefined;
  ready: boolean;
  focusSlug: string | null;
  hasInitialViewport: boolean;
  duration: number;
  getPadding: () => IMapPadding;
}

// Moves the map to the visitor's position when a fix arrives.
export function useNearMe(input: IUseNearMeInput) {
  const { getMap, ready, focusSlug } = input;
  const geo = useGeolocation(null, true);
  const userMoved = useRef(false);
  const selected = useRef(false);
  const handled = useRef(0);

  useEffect(() => {
    if (focusSlug) selected.current = true;
  }, [focusSlug]);

  useEffect(() => {
    const map = getMap();
    const request = geo.centerRequest;
    if (!ready || !map || !request || handled.current === request.id) return;
    handled.current = request.id;
    // A fix nobody tapped for must not yank the map from where the user moved it, from the
    // entry they opened, or from the view a shared link opened.
    if (
      request.auto &&
      (userMoved.current || selected.current || input.hasInitialViewport)
    )
      return;
    map.easeTo({
      center: [request.lng, request.lat],
      zoom: Math.min(request.zoom ?? LOCATE_ZOOM, LOCATE_ZOOM),
      padding: input.getPadding(),
      duration: input.duration,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, geo.centerRequest]);

  return {
    status: geo.status,
    locate: geo.locate,
    noteUserMove: () => {
      userMoved.current = true;
    },
  };
}
