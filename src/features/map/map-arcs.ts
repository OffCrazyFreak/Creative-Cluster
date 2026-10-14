import greatCircle from "@turf/great-circle";
import type {
  Feature,
  FeatureCollection,
  LineString,
  MultiLineString,
} from "geojson";

import type { IDirectoryEntry } from "@/features/directory/directory-schemas";

type Arc = Feature<LineString | MultiLineString>;

// 32 to 48 points keep long arcs smooth without adding weight to the source.
export const ARC_POINTS = 40;
export const ARC_SOURCE_ID = "connection-arcs";

function pinOf(entry: IDirectoryEntry): [number, number] | null {
  return entry.lat === null || entry.lng === null
    ? null
    : [entry.lng, entry.lat];
}

// One great-circle line per partner. Pairs without coordinates, or sharing the same coordinates
// (a great circle needs two distinct points), are skipped.
export function buildArcs(
  origin: IDirectoryEntry,
  partners: IDirectoryEntry[],
): FeatureCollection<LineString | MultiLineString> {
  const from = pinOf(origin);
  const features: Arc[] = [];
  if (from) {
    for (const partner of partners) {
      const to = pinOf(partner);
      if (!to || (to[0] === from[0] && to[1] === from[1])) continue;
      try {
        features.push(greatCircle(from, to, { npoints: ARC_POINTS }));
      } catch {
        // turf throws for exactly antipodal points; one bad pair must not take the map down.
      }
    }
  }
  return { type: "FeatureCollection", features };
}
