import { cn } from "cn";

import type { IDirectoryEntry } from "@/features/directory/directory-schemas";
import { ownImageUrl } from "@/lib/images/image-url";

import { MAP_COLORS } from "../map-colors";
import { entryInitials } from "../map-icons/entry-icon-id";

interface IMapStackTileProps {
  entry: IDirectoryEntry;
  className?: string;
}

// The HTML twin of a pin's canvas tile (entry-icon.ts), at the 0.9 scale stacks use, so a stack
// reads as the same tiles fanned.
export default function MapStackTile({ entry, className }: IMapStackTileProps) {
  return (
    <span
      className={cn(
        "absolute inset-0 flex items-center justify-center overflow-hidden rounded-md border-2 text-xs font-semibold",
        className,
      )}
      style={{
        backgroundColor: MAP_COLORS.tileFill,
        borderColor: MAP_COLORS.tileRim,
        color: MAP_COLORS.tileText,
      }}
    >
      {entry.logo ? (
        <img
          src={ownImageUrl(entry.logo)}
          alt=""
          draggable={false}
          className="size-full object-contain"
        />
      ) : (
        entryInitials(entry.name)
      )}
    </span>
  );
}
