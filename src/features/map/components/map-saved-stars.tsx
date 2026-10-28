import { Marker, useMap } from "@vis.gl/react-maplibre";
import { Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useSavedEntries } from "@/features/saved/hooks/use-saved-entries";

import { useUnstackedPoints } from "../hooks/use-unstacked-points";
import { MAP_COLORS } from "../map-colors";

// Decorative: the list names saved entries in its own group. A saved entry inside a stack gets
// no star, since the stack is drawn somewhere else.
export default function MapSavedStars() {
  const { current } = useMap();
  const { entries } = useSavedEntries();
  const points = useUnstackedPoints(
    current?.getMap(),
    entries.map((entry) => entry.slug),
  );

  return points.map(({ slug, lng, lat }) => (
    <Marker
      key={slug}
      longitude={lng}
      latitude={lat}
      anchor="right"
      offset={[-9, -16]}
      style={{ pointerEvents: "none" }}
    >
      <Badge
        aria-hidden="true"
        className="size-5 px-0 ring-2 ring-background"
        style={{ backgroundColor: MAP_COLORS.savedStar }}
      >
        <Star fill={MAP_COLORS.outline} color={MAP_COLORS.outline} />
      </Badge>
    </Marker>
  ));
}
