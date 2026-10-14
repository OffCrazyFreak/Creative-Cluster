import "maplibre-gl/dist/maplibre-gl.css";

import {
  AttributionControl,
  Layer,
  Map,
  NavigationControl,
  Source,
  type MapLayerMouseEvent,
  type MapRef,
  type ViewStateChangeEvent,
} from "@vis.gl/react-maplibre";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MAP_STYLES } from "@/constants/map-styles";
import type { IDirectoryEntry } from "@/features/directory/directory-schemas";
import { m } from "@/paraglide/messages";
import { site } from "@/sites";

import type { IBounds } from "../geo";
import { useFeatureState } from "../hooks/use-feature-state";
import {
  useMediaQuery,
  usePrefersReducedMotion,
} from "../hooks/use-media-query";
import { useMapCamera } from "../hooks/use-map-camera";
import { handleMapClick } from "../map-click";
import { buildGeoJson, buildSlugIds, SOURCE_ID } from "../map-geojson";
import {
  CLUSTER_LAYER_ID,
  CLUSTER_MAX_ZOOM,
  CLUSTER_RADIUS,
  POINT_LAYER_ID,
  clusterLayer,
  pointLayer,
} from "../map-layers";
import type { IMapPadding } from "../map-padding";
import type { IViewport } from "../map-search";
import { useMapRecovery } from "../use-map-recovery";

export interface IMapViewProps {
  // Every published entry, for stable numeric ids.
  allEntries: IDirectoryEntry[];
  // Entries matching the filters: the pins.
  pins: IDirectoryEntry[];
  initialViewport: IViewport | null;
  getPadding: () => IMapPadding;
  focusSlug: string | null;
  hoveredSlug: string | null;
  // Changes when the filters change, so the map refits to the new pins.
  fitKey: string;
  onViewportChange: (viewport: IViewport) => void;
  onUserMove: (bounds: IBounds) => void;
  onSelectSlug: (slug: string) => void;
  onListSlugs: (slugs: string[]) => void;
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
  useFeatureState({
    getMap,
    ready,
    data: geoJson,
    ids: slugIds,
    slug: focusSlug,
    key: "selected",
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
    setViewport(next);
    props.onViewportChange(next);
    const map = getMap();
    // Only gestures carry an originalEvent; the app's own camera moves must not offer "Search this area".
    if (event.originalEvent && map) {
      const b = map.getBounds();
      props.onUserMove({
        west: b.getWest(),
        south: b.getSouth(),
        east: b.getEast(),
        north: b.getNorth(),
      });
    }
  }

  async function onClick(event: MapLayerMouseEvent) {
    const map = getMap();
    const feature = event.features?.[0];
    if (!map || !feature) return;
    await handleMapClick({
      map,
      feature,
      screen: event.point,
      duration,
      onSelectSlug: props.onSelectSlug,
      onListSlugs: props.onListSlugs,
    });
  }

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={m.map_region_label()}
      className="size-full [&_.maplibregl-ctrl-attrib_a]:inline-block [&_.maplibregl-ctrl-attrib_a]:py-1.5 max-md:[&_.maplibregl-ctrl-top-left]:top-32! max-md:[&_.maplibregl-ctrl-top-right]:top-32!"
    >
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
        interactiveLayerIds={[CLUSTER_LAYER_ID, POINT_LAYER_ID]}
        cursor={cursor}
        onLoad={() => setReady(true)}
        onMoveEnd={onMoveEnd}
        onClick={(event) => void onClick(event)}
        onMouseEnter={() => setCursor("pointer")}
        onMouseLeave={() => setCursor("")}
      >
        <NavigationControl position="top-right" showCompass={false} />
        {/* On phones the sheet covers the bottom, so attribution moves below the search block. */}
        <AttributionControl
          position={wide ? "bottom-right" : "top-left"}
          compact={false}
        />
        <Source
          id={SOURCE_ID}
          type="geojson"
          data={geoJson}
          cluster
          clusterRadius={CLUSTER_RADIUS}
          clusterMaxZoom={CLUSTER_MAX_ZOOM}
          promoteId="n"
        >
          <Layer {...clusterLayer} />
          <Layer {...pointLayer} />
        </Source>
      </Map>
    </div>
  );
}
