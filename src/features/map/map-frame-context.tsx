import { createContext, useContext } from "react";

import type {
  IDirectoryEntry,
  IMapDirectory,
} from "@/features/directory/directory-schemas";

import type { IBounds } from "./geo";
import type { IMapFilters, MapSearch } from "./map-search";

export type MapStatus = "idle" | "active" | "unsupported" | "failed";

export interface IMapFrameValue {
  directory: IMapDirectory | undefined;
  search: MapSearch;
  filters: IMapFilters;
  // Entries matching the filters: the pins on the map.
  pins: IDirectoryEntry[];
  // Entries in the panel: pins narrowed by "search this area" or by a cluster click.
  listed: IDirectoryEntry[];
  mapStatus: MapStatus;
  requestMap: () => void;
  hoveredSlug: string | null;
  setHoveredSlug: (slug: string | null) => void;
  listOverride: string[] | null;
  setListOverride: (slugs: string[] | null) => void;
  areaBounds: IBounds | null;
  setAreaBounds: (bounds: IBounds | null) => void;
}

export const MapFrameContext = createContext<IMapFrameValue | null>(null);

export function useMapFrame(): IMapFrameValue {
  const value = useContext(MapFrameContext);
  if (!value) throw new Error("useMapFrame must be used inside the map frame");
  return value;
}
