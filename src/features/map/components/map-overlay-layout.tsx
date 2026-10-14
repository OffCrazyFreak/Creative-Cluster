import { lazy, Suspense, type ReactNode, type RefObject } from "react";

import { Card, CardContent } from "@/components/ui/card";

import MapFilterChips from "./map-filter-chips";
import MapSearchBar from "./map-search-bar";
import MapSkipLink from "./map-skip-link";
import MapStatusNotice from "./map-status-notice";
import type { MapStatus } from "../map-frame-context";

// Phones only: the drawer code stays out of the desktop and entry-page bundles.
const MapSheet = lazy(() => import("./map-sheet"));

interface IMapOverlayLayoutProps {
  wide: boolean;
  status: MapStatus;
  frameRef: RefObject<HTMLDivElement | null>;
  panelRef: RefObject<HTMLDivElement | null>;
  sheetRef: RefObject<HTMLDivElement | null>;
  map: ReactNode;
  searchArea: ReactNode;
  children: ReactNode;
}

// The map fills the frame; the panel floats over it (side panel on desktop, bottom sheet on phones).
export default function MapOverlayLayout({
  wide,
  status,
  frameRef,
  panelRef,
  sheetRef,
  map,
  searchArea,
  children,
}: IMapOverlayLayoutProps) {
  return (
    <div
      ref={frameRef}
      className="relative h-[calc(100dvh-var(--site-header-height,3.0625rem))] min-h-[28rem] overflow-hidden max-md:h-[calc(100dvh-var(--site-header-height,5.5625rem))]"
    >
      <MapSkipLink />
      <div className="absolute inset-0">{map}</div>
      {searchArea}
      {wide ? (
        <div
          ref={panelRef}
          className="absolute inset-y-3 left-3 z-10 flex w-96 max-w-[calc(100%-1.5rem)] flex-col gap-2"
        >
          <MapSearchBar />
          <MapFilterChips />
          <Card className="min-h-0 flex-1 overflow-y-auto">
            <CardContent id="results-panel" className="flex flex-col gap-4">
              <MapStatusNotice status={status} />
              {children}
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <div
            ref={panelRef}
            className="absolute inset-x-2 top-2 z-10 flex flex-col gap-2"
          >
            <MapSearchBar />
            <MapFilterChips />
          </div>
          <Suspense fallback={<div id="results-panel">{children}</div>}>
            <MapSheet sheetRef={sheetRef}>{children}</MapSheet>
          </Suspense>
        </>
      )}
    </div>
  );
}
