import type { GeoHit } from "@/lib/geocoding/types";

import type { LocationValue } from "./location-schemas";
import type { ITown } from "./town-types";

// A hand-placed pin is never overwritten by a new address search: only the text fields follow.
export function valueFromHit(prev: LocationValue, hit: GeoHit): LocationValue {
  const text = [hit.label, hit.secondary].filter(Boolean).join(", ");
  if (prev.pinMovedByHand) {
    return {
      ...prev,
      addressText: text,
      city: prev.city ?? hit.city,
      countryCode: prev.countryCode ?? hit.countryCode,
    };
  }
  return {
    ...prev,
    onlineOnly: false,
    addressText: text,
    lat: hit.lat,
    lng: hit.lng,
    city: hit.city,
    countryCode: hit.countryCode,
    precision: hit.precision,
    source: hit.source,
    display: "exact",
  };
}

export function valueWithPin(
  prev: LocationValue,
  pin: { lat: number; lng: number },
  movedByHand: boolean,
): LocationValue {
  return movedByHand
    ? {
        ...prev,
        ...pin,
        pinMovedByHand: true,
        source: "manual",
        precision: "house",
      }
    : { ...prev, ...pin };
}

export function valueFromManual(
  prev: LocationValue,
  fields: { city: string; countryCode: string | null; addressText: string },
): LocationValue {
  return {
    ...prev,
    onlineOnly: false,
    addressText: fields.addressText || null,
    city: fields.city || null,
    countryCode: fields.countryCode,
  };
}

// People are stored at town level only; the server offsets the pin from the entry id.
export function valueFromTown(prev: LocationValue, town: ITown): LocationValue {
  return {
    ...prev,
    onlineOnly: false,
    addressText: null,
    lat: town.lat,
    lng: town.lng,
    city: town.name,
    countryCode: town.countryCode,
    precision: "town",
    source: "town_list",
    pinMovedByHand: false,
    display: "town",
    townPopulation: town.population,
  };
}

export function valueOnlineOnly(
  prev: LocationValue,
  online: boolean,
): LocationValue {
  if (!online) return { ...prev, onlineOnly: false };
  return {
    onlineOnly: true,
    addressText: null,
    lat: null,
    lng: null,
    city: null,
    countryCode: prev.countryCode,
    precision: null,
    source: null,
    pinMovedByHand: false,
    display: prev.display,
  };
}
