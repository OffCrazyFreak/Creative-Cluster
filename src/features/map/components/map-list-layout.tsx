import type { ReactNode } from "react";

import PageContainer from "@/components/custom/layout/page-container";

import type { MapStatus } from "../map-frame-context";
import MapFilterChips from "./map-filter-chips";
import MapSearchBar from "./map-search-bar";
import MapStatusNotice from "./map-status-notice";

interface IMapListLayoutProps {
  status: MapStatus;
  entryOnly: boolean;
  children: ReactNode;
}

// The server-rendered layout: the accessible list on its own, also the fallback when the map cannot run.
export default function MapListLayout({
  status,
  entryOnly,
  children,
}: IMapListLayoutProps) {
  // An entry opened directly stands alone; its back link leads to the map.
  if (entryOnly)
    return (
      <PageContainer as="div" size="prose">
        <div id="results-panel">{children}</div>
      </PageContainer>
    );
  return (
    <PageContainer as="div" size="prose">
      <MapSearchBar />
      <MapFilterChips />
      <MapStatusNotice status={status} />
      <div id="results-panel">{children}</div>
    </PageContainer>
  );
}
