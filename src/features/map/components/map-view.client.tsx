import "maplibre-gl/dist/maplibre-gl.css";

import {
  AttributionControl,
  Map,
  NavigationControl,
  type MapRef,
  type ViewStateChangeEvent,
} from "@vis.gl/react-maplibre";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MAP_STYLES } from "@/constants/map-styles";
import type { IDirectoryEntry } from "@/features/directory/directory-schemas";
import { m } from "@/paraglide/messages";
import { site } from "@/sites";

import { useFeatureState } from "../hooks/use-feature-state";
import {
  useMediaQuery,
  usePrefersReducedMotion,
} from "../hooks/use-media-query";
import { useMapCamera } from "../hooks/use-map-camera";
import { useMapClicks } from "../hooks/use-map-clicks";
import { useNearMe } from "../hooks/use-near-me";
import { useViewReport } from "../hooks/use-view-report";
import { buildGeoJson, buildSlugIds } from "../map-geojson";
import {
  CLUSTER_LAYER_ID,
  CLUSTER_MAX_ZOOM,
  OPPORTUNITY_LAYER_ID,
  POINT_LAYER_ID,
} from "../map-layers";
import type { IMapOrigin } from "../map-origin";
import type { IMapPadding } from "../map-padding";
import type { IViewport } from "../map-search";
import { useMapRecovery } from "../use-map-recovery";
import type { IViewArea } from "../view-area";
import MapConnectionArcs from "./map-connection-arcs";
import MapEntryPins from "./map-entry-pins";
import MapLocateButton from "./map-locate-button";
import MapSameSpotPopover from "./map-same-spot-popover";
import MapSavedStars from "./map-saved-stars";
import MapSelectedFrame from "./map-selected-frame";
import MapStackMarkers from "./map-stack-markers";

export interface IMapViewProps {
  // Every published entry, for stable numeric ids.
  allEntries: IDirectoryEntry[];
  // Entries matching the filters: the pins.
  pins: IDirectoryEntry[];
  initialViewport: IViewport | null;
  getPadding: () => IMapPadding;
  // The parts of the map the floating panels hide, without the fit margin.
  getCovered: () => IMapPadding;
  coverKey: string;
  focusSlug: string | null;
  hoveredSlug: string | null;
  // Changes when the filters change, so the map refits to the new pins.
  fitKey: string;
  onViewportChange: (viewport: IViewport) => void;
  onViewChange: (area: IViewArea | null) => void;
  onSelectSlug: (slug: string) => void;
  onOriginChange: (origin: IMapOrigin | null) => void;
}

const DEFAULT_VIEWPORT: IViewport = {
  lng: site.map.center[0],
  lat: site.map.center[1],
  zoom: site.map.zoom,
};

export default function MapView(props: IMapViewProps) {
  const { allEntries, pins, initialViewport, getPadding, focusSlug } = props;
  const mapRef = useRef<MapRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState(initialViewport ?? DEFAULT_VIEWPORT);
  const [ready, setReady] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const [cursor, setCursor] = useState("");
  const reducedMotion = usePrefersReducedMotion();
  const wide = useMediaQuery("(min-width: 768px)");
  const duration = reducedMotion ? 0 : 600;
  const styleUrl = MAP_STYLES[site.map.style];

  const slugIds = useMemo(() => buildSlugIds(allEntries), [allEntries]);
  const geoJson = useMemo(() => buildGeoJson(pins, slugIds), [pins, slugIds]);
  const getMap = useCallback(() => mapRef.current?.getMap(), []);
  const remount = useCallback(() => {
    setReady(false);
    setMapKey((key) => key + 1);
  }, []);

  useMapRecovery({ getMap, ready, styleUrl, remount });
  useMapCamera({
    getMap,
    ready,
    pins,
    allEntries,
    focusSlug,
    fitKey: props.fitKey,
    hasInitialViewport: Boolean(initialViewport),
    duration,
    getPadding,
  });
  useFeatureState({
    getMap,
    ready,
    data: geoJson,
    ids: slugIds,
    slug: props.hoveredSlug,
    key: "active",
  });
  const clicks = useMapClicks({
    getMap,
    getCovered: props.getCovered,
    duration,
    onSelectSlug: props.onSelectSlug,
  });
  const nearMe = useNearMe({
    getMap,
    ready,
    focusSlug,
    hasInitialViewport: Boolean(initialViewport),
    duration,
    getPadding,
    onOriginChange: props.onOriginChange,
  });
  const reportView = useViewReport({
    getMap,
    ready,
    getCovered: props.getCovered,
    coverKey: props.coverKey,
    onViewChange: props.onViewChange,
  });

  useEffect(() => {
    const container = containerRef.current;
    const map = getMap();
    if (!container || !map) return;
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [getMap, ready]);

  function onMoveEnd(event: ViewStateChangeEvent) {
    const { latitude, longitude, zoom } = event.viewState;
    const next = { lat: latitude, lng: longitude, zoom };
    if (event.originalEvent) nearMe.noteUserMove();
    setViewport(next);
    props.onViewportChange(next);
    reportView();
  }

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={m.map_region_label()}
      className="relative size-full [&_.maplibregl-ctrl-attrib_a]:inline-block [&_.maplibregl-ctrl-attrib_a]:py-1.5 max-md:[&_.maplibregl-ctrl-bottom-right]:bottom-[min(var(--map-sheet-covered,50dvh),50dvh)]! [&_.maplibregl-ctrl-top-right]:top-12! max-md:[&_.maplibregl-ctrl-top-right]:top-44!"
    >
      <MapLocateButton status={nearMe.status} onLocate={nearMe.locate} />
      <Map
        key={mapKey}
        ref={mapRef}
        mapStyle={styleUrl}
        workerUrl={workerUrl}
        initialViewState={{
          latitude: viewport.lat,
          longitude: viewport.lng,
          zoom: viewport.zoom,
        }}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
        fadeDuration={0}
        pixelRatio={Math.min(window.devicePixelRatio, 2)}
        reduceMotion={reducedMotion}
        dragRotate={false}
        pitchWithRotate={false}
        touchPitch={false}
        maxPitch={0}
        maxZoom={CLUSTER_MAX_ZOOM}
        // The opportunity dot sits past the tile edge, so it is a target of its own.
        interactiveLayerIds={[
          CLUSTER_LAYER_ID,
          POINT_LAYER_ID,
          OPPORTUNITY_LAYER_ID,
        ]}
        cursor={cursor}
        onLoad={() => setReady(true)}
        onMoveEnd={onMoveEnd}
        onClick={(event) => void clicks.onClick(event)}
        onMouseEnter={() => setCursor("pointer")}
        onMouseLeave={() => setCursor("")}
      >
        <NavigationControl position="top-right" showCompass={false} />
        {/* On phones the control collapses to an info button that rides above the results sheet. */}
        <AttributionControl
          key={String(wide)}
          position="bottom-right"
          compact={!wide}
        />
        <MapConnectionArcs allEntries={allEntries} selectedSlug={focusSlug} />
        <MapEntryPins data={geoJson} />
        <MapSelectedFrame
          ready={ready}
          allEntries={allEntries}
          selectedSlug={focusSlug}
        />
        <MapSavedStars />
        <MapStackMarkers
          allEntries={allEntries}
          data={geoJson}
          onStackClick={clicks.onStackClick}
        />
        <MapSameSpotPopover
          spot={clicks.sameSpot}
          pins={pins}
          onSelect={clicks.selectFromSpot}
          onClose={clicks.closeSpot}
        />
      </Map>
    </div>
  );
}
