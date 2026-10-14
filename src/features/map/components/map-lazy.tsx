import { CatchBoundary, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/paraglide/messages";

import MapFailureReporter from "./map-failure-reporter";
import type { IMapViewProps } from "./map-view.client";

// Every MapLibre import lives in map-view.client.tsx; this chunk loads only after the list has painted.
const MapView = lazy(() => import("./map-view.client"));

interface IMapLazyProps extends IMapViewProps {
  onFailed: () => void;
}

export default function MapLazy({ onFailed, ...props }: IMapLazyProps) {
  return (
    <ClientOnly fallback={null}>
      <CatchBoundary
        getResetKey={() => "map"}
        errorComponent={() => <MapFailureReporter onFailed={onFailed} />}
      >
        <Suspense
          fallback={
            <div
              role="status"
              aria-label={m.map_loading()}
              className="size-full"
            >
              <Skeleton className="size-full" />
            </div>
          }
        >
          <MapView {...props} />
        </Suspense>
      </CatchBoundary>
    </ClientOnly>
  );
}
