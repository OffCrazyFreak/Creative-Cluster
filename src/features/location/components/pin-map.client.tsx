import "maplibre-gl/dist/maplibre-gl.css";

import { Map, Marker, type MapRef } from "@vis.gl/react-maplibre";
import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { COUNTRY_BBOX } from "@/lib/geocoding/country-bbox";
import { nudgeMeters, type ILatLng } from "@/utils/geo";

// Vite bundles the worker so no CDN or CSP exception is needed.
maplibregl.setWorkerUrl(workerUrl);

// OpenFreeMap: free, no key, commercial use allowed (research notes, section 1).
export const PIN_MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
const FOCUS_ZOOM = 16;
const NUDGE_M = 10;
const NUDGE_SHIFT_M = 100;

const ARROWS: Record<string, [north: number, east: number]> = {
  ArrowUp: [1, 0],
  ArrowDown: [-1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

export interface IPinMapProps {
  pin: ILatLng | null;
  countryCode: string | null;
  label: string;
  onMove: (pin: ILatLng, source: "drag" | "key" | "click") => void;
}

function fallbackCenter(countryCode: string | null) {
  const box = countryCode ? COUNTRY_BBOX[countryCode] : undefined;
  if (!box) return { longitude: 10, latitude: 50, zoom: 3 };
  return {
    longitude: (box[0] + box[2]) / 2,
    latitude: (box[1] + box[3]) / 2,
    zoom: 5,
  };
}

export default function PinMap({
  pin,
  countryCode,
  label,
  onMove,
}: IPinMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [ready, setReady] = useState(false);
  const reduceMotion = useRef(
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!pin || !ready || !map) return;
    // A first address pick starts at country zoom, so zoom in to street level once.
    map.easeTo({
      center: [pin.lng, pin.lat],
      zoom: Math.max(map.getZoom(), FOCUS_ZOOM),
      duration: reduceMotion.current ? 0 : 300,
    });
  }, [pin, ready]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = ARROWS[event.key];
    if (!step || !pin || event.target instanceof HTMLInputElement) return;
    event.preventDefault();
    const meters = event.shiftKey ? NUDGE_SHIFT_M : NUDGE_M;
    onMove(nudgeMeters(pin, step[0] * meters, step[1] * meters), "key");
  }

  return (
    <div
      role="application"
      aria-label={label}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="h-72 w-full"
    >
      <Map
        ref={mapRef}
        mapLib={maplibregl}
        mapStyle={PIN_MAP_STYLE}
        initialViewState={
          pin
            ? { longitude: pin.lng, latitude: pin.lat, zoom: 16 }
            : fallbackCenter(countryCode)
        }
        style={{ width: "100%", height: "100%" }}
        keyboard={false}
        onLoad={() => setReady(true)}
        onClick={(event) =>
          onMove({ lat: event.lngLat.lat, lng: event.lngLat.lng }, "click")
        }
      >
        {pin ? (
          <Marker
            longitude={pin.lng}
            latitude={pin.lat}
            draggable
            onDragEnd={(event) =>
              onMove({ lat: event.lngLat.lat, lng: event.lngLat.lng }, "drag")
            }
          />
        ) : null}
      </Map>
    </div>
  );
}
