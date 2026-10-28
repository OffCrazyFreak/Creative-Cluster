import { useEffect, useState } from "react";
import type { Map as MaplibreMap } from "maplibre-gl";

import { SOURCE_ID } from "../map-geojson";

export interface IUnstackedPoint {
  slug: string;
  lng: number;
  lat: number;
}

function readPoints(map: MaplibreMap, slugs: Set<string>): IUnstackedPoint[] {
  if (!map.getSource(SOURCE_ID)) return [];
  const bySlug = new Map<string, IUnstackedPoint>();
  for (const feature of map.querySourceFeatures(SOURCE_ID)) {
    if (feature.properties.cluster_id != null) continue;
    if (feature.geometry.type !== "Point") continue;
    const slug = String(feature.properties.slug);
    if (!slugs.has(slug)) continue;
    const [lng, lat] = feature.geometry.coordinates;
    bySlug.set(slug, { slug, lng, lat });
  }
  return [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

// Which of the given entries are drawn as their own pin, not inside a stack, re-read as the
// stacks change. Nothing is read while the list is empty, so guests pay no cost per frame.
export function useUnstackedPoints(
  map: MaplibreMap | undefined,
  slugs: string[],
): IUnstackedPoint[] {
  const [points, setPoints] = useState<IUnstackedPoint[]>([]);
  const slugKey = slugs.join();

  useEffect(() => {
    if (!map || !slugKey) return;
    const instance = map;
    const wanted = new Set(slugKey.split(","));
    let shown = "";

    function update() {
      const next = readPoints(instance, wanted);
      const key = next.map(({ slug, lng, lat }) => `${slug}:${lng}:${lat}`);
      if (key.join() === shown) return;
      shown = key.join();
      setPoints(next);
    }

    update();
    instance.on("render", update);
    return () => {
      instance.off("render", update);
    };
  }, [map, slugKey]);

  return slugKey ? points : [];
}
