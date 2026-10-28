import { lazy, Suspense, type ReactNode, type RefObject } from "react";

import { Card, CardContent } from "@/components/ui/card";

import MapFilterChips from "./map-filter-chips";
import MapSearchBar from "./map-search-bar";
import MapSkipLink from "./map-skip-link";
import MapStatusNotice from "./map-status-notice";
import type { MapStatus } from "../map-frame-context";

// Phones only: the bar and search code stay out of the desktop and entry-page bundles.
const MapPhoneLayout = lazy(() => import("./map-phone-layout"));

interface IMapOverlayLayoutProps {
  wide: boolean;
  status: MapStatus;
  frameRef: RefObject<HTMLDivElement | null>;
  panelRef: RefObject<HTMLDivElement | null>;
  map: ReactNode;
  children: ReactNode;
}

// The map fills the frame; the panel floats over it (side panel on desktop, floating bar on phones).
export default function MapOverlayLayout({
  wide,
  status,
  frameRef,
  panelRef,
  map,
  children,
}: IMapOverlayLayoutProps) {
  return (
    <div
      ref={frameRef}
      className="relative h-[calc(100dvh-var(--site-header-height,3.0625rem))] min-h-[28rem] overflow-hidden max-md:h-dvh"
    >
      {wide ? (
        <>
          <MapSkipLink />
          <div className="absolute inset-0">{map}</div>
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
        </>
      ) : (
        <Suspense fallback={null}>
          <MapPhoneLayout
            status={status}
            frameRef={frameRef}
            barRef={panelRef}
            map={map}
          >
            {children}
          </MapPhoneLayout>
        </Suspense>
      )}
    </div>
  );
}
