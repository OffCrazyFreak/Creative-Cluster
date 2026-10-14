import type { FeatureCollection, Point } from "geojson";

import type { IDirectoryEntry } from "@/features/directory/directory-schemas";

export const SOURCE_ID = "entries";

// Numeric id per entry (its position in the full directory) so promoteId and feature-state work.
export function buildSlugIds(entries: IDirectoryEntry[]): Map<string, number> {
  return new Map(entries.map((entry, index) => [entry.slug, index]));
}

export function buildGeoJson(
  entries: IDirectoryEntry[],
  ids: Map<string, number>,
): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: entries.flatMap((entry) =>
      entry.lat === null || entry.lng === null
        ? []
        : [
            {
              type: "Feature" as const,
              geometry: {
                type: "Point" as const,
                coordinates: [entry.lng, entry.lat],
              },
              properties: { n: ids.get(entry.slug) ?? 0, slug: entry.slug },
            },
          ],
    ),
  };
}

export function boundsOf(
  entries: IDirectoryEntry[],
): [[number, number], [number, number]] | null {
  const pinned = entries.filter((e) => e.lat !== null && e.lng !== null);
  if (pinned.length === 0) return null;
  const lats = pinned.map((e) => e.lat as number);
  const lngs = pinned.map((e) => e.lng as number);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}
