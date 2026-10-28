import { Marker, useMap } from "@vis.gl/react-maplibre";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent } from "@/components/ui/popover";
import type { IDirectoryEntry } from "@/features/directory/directory-schemas";
import { m } from "@/paraglide/messages";

import type { ISameSpot } from "../map-click";
import MapStackTile from "./map-stack-tile";

interface IMapSameSpotPopoverProps {
  spot: ISameSpot | null;
  pins: IDirectoryEntry[];
  onSelect: (slug: string) => void;
  onClose: () => void;
}

// Entries no zoom pulls apart: one building, or a stack holding a person at the privacy zoom cap.
export default function MapSameSpotPopover({
  spot,
  pins,
  onSelect,
  onClose,
}: IMapSameSpotPopoverProps) {
  const { current } = useMap();
  const map = current?.getMap();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const rows = spot ? pins.filter((pin) => spot.slugs.includes(pin.slug)) : [];

  // A filter that hides every entry here closes the list for good, rather than leaving it to
  // reappear over an old spot when the filter clears.
  const isEmpty = spot !== null && rows.length === 0;
  useEffect(() => {
    if (isEmpty) onClose();
  }, [isEmpty, onClose]);

  // The popover sits outside the map and would not follow a pan or zoom.
  useEffect(() => {
    if (!spot || !map) return;
    map.on("movestart", onClose);
    return () => {
      map.off("movestart", onClose);
    };
  }, [spot, map, onClose]);

  if (!spot || rows.length === 0) return null;

  return (
    <Popover
      open
      onOpenChange={(open, details) => {
        if (open) return;
        // There is no trigger to return to: Escape hands focus back to the map, while a click
        // elsewhere leaves it where the visitor put it.
        if (details.reason === "escape-key") map?.getCanvas().focus();
        onClose();
      }}
    >
      <Marker longitude={spot.lng} latitude={spot.lat}>
        {/* One pixel, not zero: the positioner never sees a zero-size anchor land on the map. */}
        <span ref={anchorRef} className="block size-px" />
      </Marker>
      <PopoverContent
        anchor={anchorRef}
        side="top"
        sideOffset={28}
        finalFocus={false}
        aria-label={m.map_same_spot({ count: rows.length })}
        className="w-64 gap-0 p-1"
      >
        <ul>
          {rows.map((entry) => (
            <li key={entry.slug}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  // The popover unmounts with focus inside; the map is where the visitor was.
                  map?.getCanvas().focus();
                  onSelect(entry.slug);
                }}
                className="h-auto w-full justify-start gap-2 p-2 text-left font-normal"
              >
                <span aria-hidden="true" className="relative size-7 shrink-0">
                  <MapStackTile entry={entry} />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{entry.name}</span>
                  {entry.city ? (
                    <span className="truncate text-xs">{entry.city}</span>
                  ) : null}
                </span>
              </Button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
