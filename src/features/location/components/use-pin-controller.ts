import { useEffect, useRef, useState } from "react";

import { haversineMeters, type ILatLng } from "@/utils/geo";

import { reverseGeocodeFn } from "../location.functions";
import type { LocationValue } from "../location-schemas";
import { valueWithPin } from "../location-value";

const MOVED_REVERSE_MIN_M = 5;

interface IOrigin extends ILatLng {
  precision: LocationValue["precision"];
  source: LocationValue["source"];
}

export function usePinController(
  value: LocationValue,
  onChange: (value: LocationValue) => void,
) {
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  });

  // The last geocoded position, kept so Reset can undo hand placement.
  const [origin, setOrigin] = useState<IOrigin | null>(null);
  if (
    value.lat !== null &&
    value.lng !== null &&
    !value.pinMovedByHand &&
    (origin?.lat !== value.lat || origin?.lng !== value.lng)
  ) {
    setOrigin({
      lat: value.lat,
      lng: value.lng,
      precision: value.precision,
      source: value.source,
    });
  }

  const pin =
    value.lat !== null && value.lng !== null
      ? { lat: value.lat, lng: value.lng }
      : null;

  async function fillEmptyPlace(point: ILatLng) {
    if (latest.current.city && latest.current.countryCode) return;
    try {
      const { hit } = await reverseGeocodeFn({ data: point });
      if (!hit) return;
      const now = latest.current;
      onChange({
        ...now,
        city: now.city ?? hit.city,
        countryCode: now.countryCode ?? hit.countryCode,
      });
    } catch {
      // A failed lookup only leaves city and country empty; saving is never blocked.
    }
  }

  function move(next: ILatLng, via: "drag" | "key" | "click" | "fields") {
    const farEnough = !pin || haversineMeters(pin, next) > MOVED_REVERSE_MIN_M;
    onChange(valueWithPin(latest.current, next, true));
    if ((via === "drag" || via === "click") && farEnough)
      void fillEmptyPlace(next);
  }

  function reset() {
    if (!origin) return;
    onChange({
      ...latest.current,
      lat: origin.lat,
      lng: origin.lng,
      precision: origin.precision,
      source: origin.source,
      pinMovedByHand: false,
    });
  }

  return {
    pin,
    move,
    reset,
    canReset: value.pinMovedByHand && origin !== null,
  };
}
