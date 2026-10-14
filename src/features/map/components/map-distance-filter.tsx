import { useState } from "react";

import { Button } from "@/components/ui/button";
import { site } from "@/sites";
import { m } from "@/paraglide/messages";

import { useMapFrame } from "../map-frame-context";
import { formatPoint, parsePoint, parseViewport } from "../map-search";
import { useUpdateMapSearch } from "../hooks/use-update-map-search";
import MapFilterSelect from "./map-filter-select";

const RADII_KM = [10, 25, 50, 100, 250];

// The chosen point lives in the URL (`near`), so a shared link reproduces the search.
export default function MapDistanceFilter() {
  const { search } = useMapFrame();
  const update = useUpdateMapSearch();
  const [denied, setDenied] = useState(false);
  const hasPoint = Boolean(parsePoint(search.near));

  function setPoint(point: { lat: number; lng: number }) {
    setDenied(false);
    void update({
      near: formatPoint(point),
      radius: search.radius || RADII_KM[2],
    });
  }
  function pickMapCenter() {
    const view = parseViewport(search.v);
    const [lng, lat] = site.map.center;
    setPoint(view ?? { lat, lng });
  }
  function pickMyLocation() {
    // Missing in insecure contexts and some locked-down browsers.
    if (!("geolocation" in navigator)) {
      setDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        // About 1 km: the point ends up in the URL, history and logs.
        setPoint({
          lat: Math.round(coords.latitude * 100) / 100,
          lng: Math.round(coords.longitude * 100) / 100,
        }),
      () => setDenied(true),
      { timeout: 10_000, maximumAge: 300_000 },
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={pickMyLocation}>
          {m.map_filter_near_me()}
        </Button>
        <Button variant="outline" size="sm" onClick={pickMapCenter}>
          {m.map_filter_near_center()}
        </Button>
        {hasPoint ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void update({ near: "", radius: 0 })}
          >
            {m.map_filter_near_clear()}
          </Button>
        ) : null}
      </div>
      {denied ? <p role="alert">{m.map_filter_geolocation_denied()}</p> : null}
      <MapFilterSelect
        id="map-filter-distance"
        label={m.map_filter_distance()}
        value={hasPoint && search.radius ? String(search.radius) : ""}
        options={[
          { value: "", label: m.map_filter_distance_any() },
          ...RADII_KM.map((km) => ({
            value: String(km),
            label: m.map_filter_near_set({ km }),
          })),
        ]}
        onChange={(value) =>
          hasPoint
            ? void update({ radius: Number(value) || 0 })
            : setDenied(false)
        }
      />
      {!hasPoint ? (
        <p className="text-sm">{m.map_filter_near_needs_point()}</p>
      ) : null}
    </div>
  );
}
