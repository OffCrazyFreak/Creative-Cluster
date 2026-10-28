import { Layer, Source, useMap } from "@vis.gl/react-maplibre";
import type { FeatureCollection, Point } from "geojson";
import { useEffect } from "react";

import { SOURCE_ID } from "../map-geojson";
import { watchEntryIcons } from "../map-icons/register-entry-icon";
import {
  CLUSTER_MAX_ZOOM,
  CLUSTER_RADIUS,
  clusterLayer,
  hoverLayer,
  opportunityLayer,
  pointLayer,
} from "../map-layers";

interface IMapEntryPinsProps {
  data: FeatureCollection<Point>;
}

export default function MapEntryPins({ data }: IMapEntryPinsProps) {
  const { current } = useMap();
  const map = current?.getMap();

  // The style is still loading when this mounts, so react-maplibre adds the source on a later
  // render, after the resolver is set.
  useEffect(() => (map ? watchEntryIcons(map) : undefined), [map]);

  return (
    <Source
      id={SOURCE_ID}
      type="geojson"
      data={data}
      cluster
      clusterRadius={CLUSTER_RADIUS}
      clusterMaxZoom={CLUSTER_MAX_ZOOM}
      maxzoom={CLUSTER_MAX_ZOOM + 1}
      promoteId="n"
    >
      <Layer {...clusterLayer} />
      <Layer {...hoverLayer} />
      <Layer {...pointLayer} />
      <Layer {...opportunityLayer} />
    </Source>
  );
}
