import {
  lazy,
  Suspense,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

import { Card, CardContent } from "@/components/ui/card";

import MapFilterChips from "./map-filter-chips";
import MapPhoneBarShell from "./map-phone-bar-shell";
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
  // The phone's open search or entry page covers the map, which then leaves the tab order.
  const [covered, setCovered] = useState(false);

  // Children keep fixed slots so the map stays one instance across the breakpoint (keeping the pan).
  return (
    <div
      ref={frameRef}
      className="relative h-[calc(100dvh-var(--site-header-height,3.0625rem))] min-h-[28rem] overflow-hidden max-md:h-dvh"
    >
      {wide ? <MapSkipLink /> : null}
      {wide ? null : (
        <Suspense fallback={<MapPhoneBarShell />}>
          <MapPhoneLayout
            status={status}
            frameRef={frameRef}
            barRef={panelRef}
            onCoveredChange={setCovered}
          >
            {children}
          </MapPhoneLayout>
        </Suspense>
      )}
      <div className="absolute inset-0" inert={!wide && covered}>
        {map}
      </div>
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
      ) : null}
    </div>
  );
}
