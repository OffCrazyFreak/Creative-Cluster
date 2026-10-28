import { useQuery } from "@tanstack/react-query";
import {
  Outlet,
  useMatch,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { publishedDirectoryQueryOptions } from "@/features/directory/directory-queries";
import { m } from "@/paraglide/messages";

import { useIdleActivation } from "../hooks/use-idle-activation";
import { useMapResults } from "../hooks/use-map-results";
import { useMediaQuery } from "../hooks/use-media-query";
import { useOrderSeed } from "../hooks/use-order-seed";
import {
  MapFrameContext,
  SetHoveredSlugContext,
  type IMapFrameValue,
  type MapStatus,
} from "../map-frame-context";
import {
  measureCovered,
  measurePadding,
  sheetCoveredPixels,
} from "../map-padding";
import type { IMapOrigin } from "../map-origin";
import { formatViewport, parseViewport, type IViewport } from "../map-search";
import { sameView, type IViewArea } from "../view-area";
import { supportsWebgl2 } from "../webgl";
import MapLazy from "./map-lazy";
import MapListLayout from "./map-list-layout";
import MapOverlayLayout from "./map-overlay-layout";

// The pathless layout of "/", "/e/$slug" and the opportunities board. It stays mounted while the
// panel (the Outlet) changes, so the map never reloads between those pages.
export default function MapFrame() {
  const search = useSearch({ from: "/_map" });
  const navigate = useNavigate();
  const entryMatch = useMatch({ from: "/_map/e/$slug", shouldThrow: false });
  const focusSlug = entryMatch?.params.slug ?? null;
  const wide = useMediaQuery("(min-width: 768px)");
  const seed = useOrderSeed();

  const [status, setStatus] = useState<MapStatus>("idle");
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const filterSignature = [
    search.q,
    search.tags,
    search.country,
    search.legal,
    search.near,
    search.radius,
  ].join("|");
  const [viewArea, setViewArea] = useState<IViewArea | null>(null);
  // GPS or the IP guess, reported by the map; the list sorts from it.
  const [origin, setOrigin] = useState<IMapOrigin | null>(null);
  // Lets the map keep its attribution and the list's "on the map" group above the phone sheet.
  const [sheetCovered, setSheetCovered] = useState("50dvh");

  // An entry opened directly stays map-free (no MapLibre download) until the visitor asks for it.
  const [directoryWanted, setDirectoryWanted] = useState(false);
  // Filter options and popular tags need the data (a small JSON), so entry pages fetch it when idle.
  useIdleActivation(Boolean(entryMatch) && !directoryWanted, () =>
    setDirectoryWanted(true),
  );
  const directoryQuery = useQuery({
    ...publishedDirectoryQueryOptions(),
    enabled: !entryMatch || status === "active" || directoryWanted,
  });
  const directory = directoryQuery.data;
  const { filters, pins } = useMapResults({
    directory,
    search,
    seed,
    origin: origin?.point ?? null,
  });

  const requestMap = useCallback(() => {
    setStatus(supportsWebgl2() ? "active" : "unsupported");
  }, []);
  useIdleActivation(!entryMatch && status === "idle", requestMap);

  const frameRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const getPadding = useCallback(
    () =>
      measurePadding(
        frameRef.current?.getBoundingClientRect() ??
          new DOMRect(0, 0, 1000, 700),
        panelRef.current?.getBoundingClientRect() ?? null,
        sheetRef.current?.getBoundingClientRect() ?? null,
        wide,
      ),
    [wide],
  );
  const getCovered = useCallback(
    () =>
      measureCovered(
        frameRef.current?.getBoundingClientRect() ??
          new DOMRect(0, 0, 1000, 700),
        panelRef.current?.getBoundingClientRect() ?? null,
        window.innerHeight -
          sheetCoveredPixels(sheetCovered, window.innerHeight),
        wide,
      ),
    [wide, sheetCovered],
  );
  const reportViewArea = useCallback((next: IViewArea | null) => {
    setViewArea((prev) => (sameView(prev, next) ? prev : next));
  }, []);

  const initialViewport = useMemo<IViewport | null>(
    () => parseViewport(search.v),
    // Read once: later `v` writes must not move the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  // Panning writes `v` often; one debounced replace keeps history and loaders quiet.
  const viewportTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(viewportTimer.current), []);
  const writeViewport = useCallback(
    (viewport: IViewport) => {
      window.clearTimeout(viewportTimer.current);
      viewportTimer.current = window.setTimeout(
        () =>
          void navigate({
            to: ".",
            search: (prev) => ({ ...prev, v: formatViewport(viewport) }),
            replace: true,
          }),
        400,
      );
    },
    [navigate],
  );

  const value = useMemo<IMapFrameValue>(
    () => ({
      directory,
      search,
      filters,
      pins,
      mapStatus: status,
      requestMap,
      viewArea,
      origin,
    }),
    [directory, search, filters, pins, status, requestMap, viewArea, origin],
  );

  const outlet = <Outlet />;
  const live = directory ? (
    <p role="status" aria-live="polite" className="sr-only">
      {m.map_results_live({ count: pins.length })}
    </p>
  ) : null;

  if (status !== "active" || !directory) {
    return (
      <MapFrameContext.Provider value={value}>
        <SetHoveredSlugContext.Provider value={setHoveredSlug}>
          {live}
          <MapListLayout
            status={status}
            entryOnly={Boolean(entryMatch) && status === "idle"}
          >
            {outlet}
          </MapListLayout>
        </SetHoveredSlugContext.Provider>
      </MapFrameContext.Provider>
    );
  }

  return (
    <MapFrameContext.Provider value={value}>
      <SetHoveredSlugContext.Provider value={setHoveredSlug}>
        {live}
        <MapOverlayLayout
          wide={wide}
          status={status}
          frameRef={frameRef}
          panelRef={panelRef}
          sheetRef={sheetRef}
          map={
            <MapLazy
              allEntries={directory.entries}
              pins={pins}
              initialViewport={initialViewport}
              getPadding={getPadding}
              getCovered={getCovered}
              coverKey={wide ? "wide" : sheetCovered}
              focusSlug={focusSlug}
              hoveredSlug={hoveredSlug}
              fitKey={filterSignature}
              onViewportChange={writeViewport}
              onViewChange={reportViewArea}
              onOriginChange={setOrigin}
              onSelectSlug={(slug) =>
                void navigate({ to: "/e/$slug", params: { slug } })
              }
              onFailed={() => {
                setStatus("failed");
                setViewArea(null);
              }}
            />
          }
          sheetCovered={sheetCovered}
          onSheetCoveredChange={setSheetCovered}
        >
          {outlet}
        </MapOverlayLayout>
      </SetHoveredSlugContext.Provider>
    </MapFrameContext.Provider>
  );
}
