import { Layer, Source } from "@vis.gl/react-maplibre";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { partnerSlugsQuery } from "@/features/connections/connections-queries";
import type { IDirectoryEntry } from "@/features/directory/directory-schemas";

import { ARC_SOURCE_ID, buildArcs } from "../map-arcs";
import { arcLayer } from "../map-layers";

interface IMapConnectionArcsProps {
  allEntries: IDirectoryEntry[];
  selectedSlug: string | null;
}

// Client-only like the rest of the map code: it imports MapLibre bindings.
export default function MapConnectionArcs({
  allEntries,
  selectedSlug,
}: IMapConnectionArcsProps) {
  const { data: partnerSlugs } = useQuery({
    ...partnerSlugsQuery(selectedSlug ?? ""),
    enabled: Boolean(selectedSlug),
  });
  const arcs = useMemo(() => {
    const origin = allEntries.find((entry) => entry.slug === selectedSlug);
    if (!origin || !partnerSlugs) return null;
    const wanted = new Set(partnerSlugs);
    return buildArcs(
      origin,
      allEntries.filter((entry) => wanted.has(entry.slug)),
    );
  }, [allEntries, selectedSlug, partnerSlugs]);

  if (!arcs || arcs.features.length === 0) return null;
  return (
    <Source id={ARC_SOURCE_ID} type="geojson" data={arcs}>
      <Layer {...arcLayer} />
    </Source>
  );
}
