import type { LocationValue } from "./location-schemas";
import { pseudonymPin } from "./person-offset.server";

// Call in the entry service when a person is saved: the stored pin is the offset one, never the town centre.
// Only a fresh TownPicker value carries townPopulation; a value read back from the database is already offset.
export function applyPersonOffset(
  entryId: string,
  value: LocationValue,
): LocationValue {
  if (value.lat === null || value.lng === null || value.townPopulation == null)
    return value;
  const pin = pseudonymPin(entryId, {
    lat: value.lat,
    lng: value.lng,
    population: value.townPopulation,
    name: value.city ?? "",
    countryCode: value.countryCode ?? "",
  });
  return {
    ...value,
    ...pin,
    display: "town",
    precision: "town",
    source: "town_list",
    pinMovedByHand: false,
  };
}
