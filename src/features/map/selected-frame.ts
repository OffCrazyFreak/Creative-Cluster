import type { GeoJSONSource, Map as MaplibreMap } from "maplibre-gl";

import { SOURCE_ID } from "./map-geojson";
import { CLUSTER_LAYER_ID, POINT_LAYER_ID } from "./map-layers";

export interface ISelectedFrame {
  lng: number;
  lat: number;
  // Framing a cluster, which is wider than one tile.
  wide: boolean;
}

// Where the selected entry shows right now: its own tile, or the cluster it merged into once the
// map zoomed out. Null while neither is on screen, so the frame never circles empty map.
export async function findSelectedFrame(
  map: MaplibreMap,
  slug: string,
  point: { lng: number; lat: number },
): Promise<ISelectedFrame | null> {
  // While a recovered style reloads the layers are gone, and querying them would log errors.
  if (!map.getLayer(POINT_LAYER_ID) || !map.getLayer(CLUSTER_LAYER_ID))
    return null;
  const singles = map.queryRenderedFeatures({ layers: [POINT_LAYER_ID] });
  if (singles.some((feature) => feature.properties.slug === slug))
    return { ...point, wide: false };

  const source = map.getSource<GeoJSONSource>(SOURCE_ID);
  if (!source) return null;

  // A cluster can be reported once per tile it spans, so keep one each.
  const clusters = [
    ...new Map(
      map
        .queryRenderedFeatures({ layers: [CLUSTER_LAYER_ID] })
        .filter((cluster) => cluster.geometry.type === "Point")
        .map((cluster) => [Number(cluster.properties.cluster_id), cluster]),
    ),
  ];
  const holds = await Promise.all(
    clusters.map(async ([id]) =>
      (await source.getClusterLeaves(id, Infinity, 0)).some(
        (leaf) => leaf.properties?.slug === slug,
      ),
    ),
  );

  const found = clusters.find((_, index) => holds[index])?.[1];
  if (!found || found.geometry.type !== "Point") return null;
  const [lng, lat] = found.geometry.coordinates;
  return { lng, lat, wide: true };
}

export function sameFrame(a: ISelectedFrame | null, b: ISelectedFrame | null) {
  return a?.lat === b?.lat && a?.lng === b?.lng && a?.wide === b?.wide;
}
