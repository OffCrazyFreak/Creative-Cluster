import { useEffect } from "react";
import type { Map as MaplibreMap } from "maplibre-gl";

import { SOURCE_ID } from "../map-geojson";

interface IUseFeatureStateInput {
  getMap: () => MaplibreMap | undefined;
  ready: boolean;
  // Changes when the source data is replaced, so the state is applied again.
  data: unknown;
  ids: Map<string, number>;
  slug: string | null;
  key: "active" | "selected";
}

// Mirrors list hover/focus and the open entry onto the pin through feature-state.
export function useFeatureState({
  getMap,
  ready,
  data,
  ids,
  slug,
  key,
}: IUseFeatureStateInput) {
  useEffect(() => {
    const map = getMap();
    const id = slug ? ids.get(slug) : undefined;
    if (!ready || !map || id === undefined || !map.getSource(SOURCE_ID)) return;
    map.setFeatureState({ source: SOURCE_ID, id }, { [key]: true });
    return () => {
      if (map.getSource(SOURCE_ID))
        map.removeFeatureState({ source: SOURCE_ID, id }, key);
    };
  }, [getMap, ready, data, ids, slug, key]);
}
