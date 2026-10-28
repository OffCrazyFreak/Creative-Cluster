import { useEffect, useState } from "react";
import type { GeoJSONSource, Map as MaplibreMap } from "maplibre-gl";

import type { IDirectoryEntry } from "@/features/directory/directory-schemas";

import { topOfStack } from "../entry-rank";
import { SOURCE_ID } from "../map-geojson";

const FACES = 3;

interface ICluster {
  id: number;
  count: number;
  lng: number;
  lat: number;
}

export interface IClusterStack extends ICluster {
  // Up to three entries shown on the stack, the first one in front.
  faces: IDirectoryEntry[];
}

// One per cluster in view; a cluster can be reported once per tile it spans.
function readClusters(map: MaplibreMap): ICluster[] {
  if (!map.getSource(SOURCE_ID)) return [];
  const bounds = map.getBounds();
  const byId = new Map<number, ICluster>();
  for (const feature of map.querySourceFeatures(SOURCE_ID, {
    filter: ["has", "point_count"],
  })) {
    if (feature.properties.cluster_id == null) continue;
    if (feature.geometry.type !== "Point") continue;
    const id = Number(feature.properties.cluster_id);
    const [lng, lat] = feature.geometry.coordinates;
    if (byId.has(id) || !bounds.contains([lng, lat])) continue;
    byId.set(id, {
      id,
      count: Number(feature.properties.point_count),
      lng,
      lat,
    });
  }
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

// MapLibre's "HTML clusters" pattern: read the clusters on every render, and rank a cluster's
// entries in JS (expressions cannot sort distinct entries) only when the set of clusters changes.
export function useClusterStacks(
  map: MaplibreMap | undefined,
  bySlug: Map<string, IDirectoryEntry>,
  // New pins can reuse a cluster id, count and position with other entries inside.
  data: unknown,
): IClusterStack[] {
  const [stacks, setStacks] = useState<IClusterStack[]>([]);

  useEffect(() => {
    if (!map) return;
    const instance = map;
    let shown = "";
    let cancelled = false;

    async function rank(clusters: ICluster[]) {
      const source = instance.getSource<GeoJSONSource>(SOURCE_ID);
      if (!source) return [];
      return Promise.all(
        clusters.map(async (cluster) => {
          const leaves = await source.getClusterLeaves(cluster.id, Infinity, 0);
          const entries = leaves.flatMap(
            (leaf) => bySlug.get(String(leaf.properties?.slug)) ?? [],
          );
          return { ...cluster, faces: topOfStack(entries, FACES) };
        }),
      );
    }

    function update() {
      const clusters = readClusters(instance);
      const key = clusters
        .map(({ id, count, lng, lat }) => `${id}:${count}:${lng}:${lat}`)
        .join();
      if (key === shown) return;
      shown = key;
      rank(clusters)
        .then((next) => {
          if (!cancelled && shown === key) setStacks(next);
        })
        // A data change can retire a cluster mid-lookup; forget the key so the next render retries.
        .catch(() => {
          if (shown === key) shown = "";
        });
    }

    update();
    instance.on("render", update);
    return () => {
      cancelled = true;
      instance.off("render", update);
    };
  }, [map, bySlug, data]);

  return stacks;
}
