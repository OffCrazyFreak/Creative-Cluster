import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import { useMemo } from "react";

import type { IDirectoryEntry } from "@/features/directory/directory-schemas";

import { useSelectedFrame } from "../hooks/use-selected-frame";
import { OPPORTUNITY_LAYER_ID } from "../map-layers";
import {
  SELECTED_FRAME_ID,
  SELECTED_STACK_FRAME_ID,
} from "../map-icons/entry-icon-id";

interface IMapSelectedFrameProps {
  // True once the entry layers exist, so the frame can find its cluster.
  ready: boolean;
  allEntries: IDirectoryEntry[];
  selectedSlug: string | null;
}

// Drawn on the canvas above the pins but under the opportunities dot; cluster counts will be HTML
// badges above the canvas, so the frame never covers a number.
export default function MapSelectedFrame({
  ready,
  allEntries,
  selectedSlug,
}: IMapSelectedFrameProps) {
  const { current } = useMap();
  const point = useMemo(() => {
    const entry = allEntries.find((item) => item.slug === selectedSlug);
    return entry?.lat != null && entry.lng != null
      ? { lat: entry.lat, lng: entry.lng }
      : null;
  }, [allEntries, selectedSlug]);
  const frame = useSelectedFrame({
    map: current?.getMap(),
    ready,
    slug: selectedSlug,
    point,
  });

  if (!frame) return null;
  return (
    <Source
      id="selected-entry"
      type="geojson"
      data={{
        type: "Feature",
        geometry: { type: "Point", coordinates: [frame.lng, frame.lat] },
        properties: {},
      }}
    >
      <Layer
        id="selected-entry-frame"
        type="symbol"
        beforeId={OPPORTUNITY_LAYER_ID}
        layout={{
          "icon-image": frame.wide
            ? SELECTED_STACK_FRAME_ID
            : SELECTED_FRAME_ID,
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        }}
      />
    </Source>
  );
}
