import type { ReactNode } from "react";

import MobileMenu from "@/components/custom/layout/mobile-menu";
import PageContainer from "@/components/custom/layout/page-container";

import type { MapStatus } from "../map-frame-context";
import MapAccountButton from "./map-account-button";
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
      <div data-map-bar="" className="flex items-center gap-2">
        <div className="md:hidden">
          <MobileMenu />
        </div>
        <div className="min-w-0 flex-1">
          <MapSearchBar />
        </div>
        <div className="md:hidden">
          <MapAccountButton />
        </div>
      </div>
      <MapFilterChips />
      <MapStatusNotice status={status} />
      <div id="results-panel">{children}</div>
    </PageContainer>
  );
}
