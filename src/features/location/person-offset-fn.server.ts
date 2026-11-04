import type { LocationValue } from "./location-schemas";
import { pseudonymPin } from "./person-offset.server";

// Only a fresh TownPicker value is offset; stored values already are, and anything else loses its coordinates so people are never exact.
export function applyPersonOffset(
  entryId: string,
  value: LocationValue,
): LocationValue {
  if (value.lat === null || value.lng === null) return value;
  if (value.source !== "town_list") return withoutPin(value);
  if (value.townPopulation == null) return value;
  const pin = pseudonymPin(entryId, {
    lat: value.lat,
    lng: value.lng,
    population: value.townPopulation,
    name: value.city ?? "",
    countryCode: value.countryCode ?? "",
  });
  const { townPopulation: _unused, ...stored } = value;
  return {
    ...stored,
    ...pin,
    display: "town",
    precision: "town",
    source: "town_list",
    pinMovedByHand: false,
  };
}

function withoutPin(value: LocationValue): LocationValue {
  return {
    ...value,
    addressText: null,
    lat: null,
    lng: null,
    precision: null,
    source: null,
    pinMovedByHand: false,
    townPopulation: undefined,
  };
}
