import { createContext, useContext } from "react";

import type {
  IDirectoryEntry,
  IMapDirectory,
} from "@/features/directory/directory-schemas";

import type { IMapFilters, MapSearch } from "./map-search";
import type { IViewArea } from "./view-area";

export type MapStatus = "idle" | "active" | "unsupported" | "failed";

export interface IMapFrameValue {
  directory: IMapDirectory | undefined;
  search: MapSearch;
  filters: IMapFilters;
  // Entries matching the filters: the pins on the map.
  pins: IDirectoryEntry[];
  mapStatus: MapStatus;
  requestMap: () => void;
  // The part of the map in sight, which the list groups its entries by; null without a map.
  viewArea: IViewArea | null;
}

export const MapFrameContext = createContext<IMapFrameValue | null>(null);

export function useMapFrame(): IMapFrameValue {
  const value = useContext(MapFrameContext);
  if (!value) throw new Error("useMapFrame must be used inside the map frame");
  return value;
}

// Hover has its own context, with a stable setter, so hovering never re-renders the whole list.
export const SetHoveredSlugContext = createContext<
  (slug: string | null) => void
>(() => undefined);
