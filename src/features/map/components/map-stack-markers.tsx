import { Marker, useMap } from "@vis.gl/react-maplibre";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import type { IDirectoryEntry } from "@/features/directory/directory-schemas";

import { useClusterStacks } from "../hooks/use-cluster-stacks";
import MapStackTile from "./map-stack-tile";

// Back to front: the third entry peeks out on the right, the second on the left, the first sits
// in front.
const FAN = [
  "translate-x-2.5 translate-y-0.5 rotate-10",
  "-translate-x-2.5 translate-y-0.5 -rotate-10",
  "",
];

interface IMapStackMarkersProps {
  allEntries: IDirectoryEntry[];
  // The pins' GeoJSON, so the stacks re-rank when the filters change.
  data: unknown;
  onStackClick: (clusterId: number) => void;
}

// Nearby entries merge into one stack: up to three tiles, fanned, plus the entry count as the
// app's own Badge. HTML over the canvas, so the selection frame never covers a count. Pointer
// only, like the canvas tiles: the list is the keyboard path.
export default function MapStackMarkers({
  allEntries,
  data,
  onStackClick,
}: IMapStackMarkersProps) {
  const { current } = useMap();
  const bySlug = useMemo(
    () => new Map(allEntries.map((entry) => [entry.slug, entry])),
    [allEntries],
  );
  const stacks = useClusterStacks(current?.getMap(), bySlug, data);

  return stacks.map(({ id, count, lng, lat, faces }) => (
    <Marker
      key={id}
      longitude={lng}
      latitude={lat}
      anchor="center"
      onClick={(event) => {
        event.originalEvent.stopPropagation();
        onStackClick(id);
      }}
    >
      <div aria-hidden="true" className="relative size-8 cursor-pointer">
        {faces
          .map((entry, rank) => (
            <MapStackTile
              key={entry.slug}
              entry={entry}
              className={FAN[FAN.length - 1 - rank]}
            />
          ))
          .reverse()}
        <Badge className="absolute -top-2.5 left-6 min-w-5 px-1 tabular-nums ring-2 ring-background">
          {count}
        </Badge>
      </div>
    </Marker>
  ));
}
