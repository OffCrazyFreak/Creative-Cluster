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

import type { IBounds } from "../geo";
import { useIdleActivation } from "../hooks/use-idle-activation";
import { useMapResults } from "../hooks/use-map-results";
import { useMediaQuery } from "../hooks/use-media-query";
import { useOrderSeed } from "../hooks/use-order-seed";
import { useSignatureState } from "../hooks/use-signature-state";
import {
  MapFrameContext,
  SetHoveredSlugContext,
  type IMapFrameValue,
  type MapStatus,
} from "../map-frame-context";
import { measurePadding } from "../map-padding";
import { formatViewport, parseViewport, type IViewport } from "../map-search";
import { supportsWebgl2 } from "../webgl";
import MapLazy from "./map-lazy";
import MapListLayout from "./map-list-layout";
import MapOverlayLayout from "./map-overlay-layout";
import MapSearchAreaButton from "./map-search-area-button";

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
  const [pendingBounds, setPendingBounds] = useState<IBounds | null>(null);
  const filterSignature = [
    search.q,
    search.tags,
    search.country,
    search.legal,
    search.near,
    search.radius,
  ].join("|");
  const [listOverride, setListOverride] =
    useSignatureState<string[]>(filterSignature);
  const [areaBounds, setAreaBounds] =
    useSignatureState<IBounds>(filterSignature);

  // An entry opened directly stays map-free (no MapLibre download) until the visitor asks for it.
  const directoryQuery = useQuery({
    ...publishedDirectoryQueryOptions(),
    enabled: !entryMatch || status === "active",
  });
  const directory = directoryQuery.data;
  const { filters, pins, listed } = useMapResults({
    directory,
    search,
    seed,
    areaBounds,
    listOverride,
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

  const applyAreaBounds = useCallback(
    (bounds: IBounds | null) => {
      setAreaBounds(bounds);
      setPendingBounds(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterSignature],
  );
  const value = useMemo<IMapFrameValue>(
    () => ({
      directory,
      search,
      filters,
      pins,
      listed,
      mapStatus: status,
      requestMap,
      listOverride,
      setListOverride,
      areaBounds,
      setAreaBounds: applyAreaBounds,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      directory,
      search,
      filters,
      pins,
      listed,
      status,
      requestMap,
      listOverride,
      areaBounds,
      applyAreaBounds,
    ],
  );

  const outlet = <Outlet />;
  const live = directory ? (
    <p role="status" aria-live="polite" className="sr-only">
      {m.map_results_live({ count: listed.length })}
    </p>
  ) : null;

  if (status !== "active" || !directory) {
    return (
      <MapFrameContext.Provider value={value}>
        <SetHoveredSlugContext.Provider value={setHoveredSlug}>
          {live}
          <MapListLayout
            status={status}
            canShowMap={Boolean(entryMatch) && status === "idle"}
            onShowMap={requestMap}
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
              focusSlug={focusSlug}
              hoveredSlug={hoveredSlug}
              fitKey={filterSignature}
              onViewportChange={writeViewport}
              onUserMove={setPendingBounds}
              onSelectSlug={(slug) =>
                void navigate({ to: "/e/$slug", params: { slug } })
              }
              onListSlugs={(slugs) => {
                setListOverride(slugs);
                void navigate({ to: "/", search: (prev) => prev });
              }}
              onFailed={() => setStatus("failed")}
            />
          }
          searchArea={
            pendingBounds ? (
              <MapSearchAreaButton
                onClick={() => value.setAreaBounds(pendingBounds)}
              />
            ) : null
          }
        >
          {outlet}
        </MapOverlayLayout>
      </SetHoveredSlugContext.Provider>
    </MapFrameContext.Provider>
  );
}
