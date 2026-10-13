import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

import type { MapStatus } from "../map-frame-context";
import MapFilterChips from "./map-filter-chips";
import MapSearchBar from "./map-search-bar";
import MapStatusNotice from "./map-status-notice";

interface IMapListLayoutProps {
  status: MapStatus;
  canShowMap: boolean;
  onShowMap: () => void;
  children: ReactNode;
}

// The server-rendered layout: the accessible list on its own, also the fallback when the map cannot run.
export default function MapListLayout({
  status,
  canShowMap,
  onShowMap,
  children,
}: IMapListLayoutProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <MapSearchBar />
      <MapFilterChips />
      <MapStatusNotice status={status} />
      {canShowMap ? (
        <Button variant="outline" className="self-start" onClick={onShowMap}>
          {m.map_show_map()}
        </Button>
      ) : null}
      <div id="results-panel">{children}</div>
    </div>
  );
}
