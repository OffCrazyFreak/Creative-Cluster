import type { Point } from "geojson";
import type {
  GeoJSONSource,
  Map as MaplibreMap,
  MapGeoJSONFeature,
} from "maplibre-gl";

import { SOURCE_ID } from "./map-geojson";
import {
  CLUSTER_LAYER_ID,
  CLUSTER_MAX_ZOOM,
  POINT_LAYER_ID,
} from "./map-layers";

const SAME_POINT_DEGREES = 1e-5;
const MAX_LEAVES = 200;

interface IClickInput {
  map: MaplibreMap;
  feature: MapGeoJSONFeature;
  screen: { x: number; y: number };
  duration: number;
  onSelectSlug: (slug: string) => void;
  onListSlugs: (slugs: string[]) => void;
}

function isSamePoint(leaves: { geometry: unknown }[]): boolean {
  const [first] = leaves.map((leaf) => (leaf.geometry as Point).coordinates);
  return leaves.every((leaf) => {
    const [lng, lat] = (leaf.geometry as Point).coordinates;
    return (
      Math.abs(lng - first[0]) < SAME_POINT_DEGREES &&
      Math.abs(lat - first[1]) < SAME_POINT_DEGREES
    );
  });
}

// A cluster zooms in; on one spot or at the clustering limit there is nothing left to split, so the
// panel lists those entries instead (no spiderfy). Overlapping single points behave the same way.
export async function handleMapClick({
  map,
  feature,
  screen,
  duration,
  onSelectSlug,
  onListSlugs,
}: IClickInput) {
  if (feature.layer.id === CLUSTER_LAYER_ID) {
    const source = map.getSource<GeoJSONSource>(SOURCE_ID);
    if (!source) return;
    const clusterId = Number(feature.properties.cluster_id);
    const count = Number(feature.properties.point_count);
    const leaves = await source.getClusterLeaves(
      clusterId,
      Math.min(count, MAX_LEAVES),
      0,
    );
    if (isSamePoint(leaves) || map.getZoom() >= CLUSTER_MAX_ZOOM) {
      onListSlugs(leaves.map((leaf) => String(leaf.properties?.slug)));
      return;
    }
    const zoom = await source.getClusterExpansionZoom(clusterId);
    const [lng, lat] = (feature.geometry as Point).coordinates;
    map.easeTo({ center: [lng, lat], zoom, duration });
    return;
  }

  // The exact point: a 36 px tile is target enough, and a margin would catch the neighbours too.
  const nearby = map.queryRenderedFeatures([screen.x, screen.y], {
    layers: [POINT_LAYER_ID],
  });
  const slugs = [
    ...new Set(nearby.map((item) => String(item.properties.slug))),
  ];
  if (slugs.length > 1) onListSlugs(slugs);
  else onSelectSlug(String(feature.properties.slug));
}
