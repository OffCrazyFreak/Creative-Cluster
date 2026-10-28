import type { MapLayerMouseEvent } from "@vis.gl/react-maplibre";
import type { Map as MaplibreMap } from "maplibre-gl";
import { useCallback, useState } from "react";

import { handleMapClick, openStack, type ISameSpot } from "../map-click";
import type { IMapPadding } from "../map-padding";

interface IUseMapClicksInput {
  getMap: () => MaplibreMap | undefined;
  getCovered: () => IMapPadding;
  duration: number;
  onSelectSlug: (slug: string) => void;
}

// Pin and stack taps, and the popover a stack on one spot opens.
export function useMapClicks({
  getMap,
  getCovered,
  duration,
  onSelectSlug,
}: IUseMapClicksInput) {
  const [sameSpot, setSameSpot] = useState<ISameSpot | null>(null);
  const closeSpot = useCallback(() => setSameSpot(null), []);

  async function onClick(event: MapLayerMouseEvent) {
    const map = getMap();
    const feature = event.features?.[0];
    if (!map || !feature) return;
    await handleMapClick({
      map,
      feature,
      covered: getCovered(),
      duration,
      onSelectSlug,
      onSameSpot: setSameSpot,
    });
  }

  function onStackClick(clusterId: number) {
    const map = getMap();
    if (!map) return;
    openStack({
      map,
      clusterId,
      covered: getCovered(),
      duration,
      onSameSpot: setSameSpot,
    }).catch(() => {
      // The stack was re-clustered under the tap; the next render shows the current ones.
    });
  }

  function selectFromSpot(slug: string) {
    setSameSpot(null);
    onSelectSlug(slug);
  }

  return { sameSpot, closeSpot, selectFromSpot, onClick, onStackClick };
}
