import type { LocationValue } from "./location-schemas";
import { pseudonymPin } from "./person-offset.server";

// Call in the entry service when a person is saved. Only a fresh TownPicker value (source town_list with
// townPopulation) is offset; a value read back from the database already is, so it passes unchanged.
// Anything else (a PinPicker value, a forged request) loses its coordinates: people are never stored exactly.
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
