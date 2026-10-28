import type {
  GeoJSONSource,
  Map as MaplibreMap,
  MapGeoJSONFeature,
} from "maplibre-gl";

import {
  fitPadding,
  isSameSpot,
  leafBounds,
  PERSON_MAX_FIT_ZOOM,
  toLeaf,
} from "./cluster-leaves";
import { SOURCE_ID } from "./map-geojson";
import { CLUSTER_LAYER_ID } from "./map-layers";
import type { IMapPadding } from "./map-padding";

export interface ISameSpot {
  lng: number;
  lat: number;
  slugs: string[];
}

interface IStackInput {
  map: MaplibreMap;
  clusterId: number;
  // Map pixels under the panel and the phone sheet, kept clear when zooming in.
  covered: IMapPadding;
  duration: number;
  onSameSpot: (spot: ISameSpot) => void;
}

interface IClickInput extends Omit<IStackInput, "clusterId"> {
  feature: MapGeoJSONFeature;
  onSelectSlug: (slug: string) => void;
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

// A stack zooms to fit exactly its entries. Entries on one spot never split (clustering runs to
// the deepest zoom), so a popover lists them instead; so does a stack holding a person once the
// fit is already at that person's zoom cap.
export async function openStack({
  map,
  clusterId,
  covered,
  duration,
  onSameSpot,
}: IStackInput) {
  const source = map.getSource<GeoJSONSource>(SOURCE_ID);
  if (!source) return;
  const features = await source.getClusterLeaves(clusterId, Infinity, 0);
  const leaves = features.flatMap((feature) => toLeaf(feature) ?? []);
  if (leaves.length === 0) return;
  const maxZoom = leaves.some((leaf) => leaf.person)
    ? PERSON_MAX_FIT_ZOOM
    : map.getMaxZoom();
  if (isSameSpot(leaves) || map.getZoom() >= maxZoom) {
    onSameSpot({
      lng: average(leaves.map((leaf) => leaf.lng)),
      lat: average(leaves.map((leaf) => leaf.lat)),
      slugs: leaves.map((leaf) => leaf.slug),
    });
    return;
  }
  const { clientWidth, clientHeight } = map.getCanvas();
  const bounds = leafBounds(leaves);
  // Absolute: the camera hook leaves the panel padding on the map, which would count twice.
  const options = {
    padding: fitPadding(clientWidth, clientHeight, covered),
    maxZoom,
    absolutePadding: true,
  };
  const camera = map.cameraForBounds(bounds, options);
  if (camera?.zoom !== undefined && camera.zoom > map.getZoom()) {
    map.fitBounds(bounds, { ...options, duration });
    return;
  }
  // A cramped map (a phone in landscape) can fit no closer than now; zoom in until it splits.
  const [[west, south], [east, north]] = bounds;
  const zoom = await source.getClusterExpansionZoom(clusterId);
  map.easeTo({
    center: [(west + east) / 2, (south + north) / 2],
    zoom: Math.min(zoom, maxZoom),
    padding: options.padding,
    duration,
  });
}

// Pins never overlap (clustering runs to the deepest zoom with a radius wider than a tile), so a
// pin tap is always exactly one entry.
export async function handleMapClick({
  feature,
  onSelectSlug,
  ...stack
}: IClickInput) {
  if (feature.layer.id === CLUSTER_LAYER_ID) {
    const clusterId = Number(feature.properties.cluster_id);
    await openStack({ ...stack, clusterId });
    return;
  }
  onSelectSlug(String(feature.properties.slug));
}
