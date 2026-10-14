import type { entry } from "@/db/schema";
import { emptyLocation, type LocationValue } from "@/features/location";

type EntryRow = typeof entry.$inferSelect;

export function locationToColumns(value: LocationValue) {
  return {
    onlineOnly: value.onlineOnly,
    addressText: value.addressText,
    lat: value.lat,
    lng: value.lng,
    city: value.city,
    countryCode: value.countryCode,
    precision: value.precision,
    locationSource: value.source,
    pinMovedByHand: value.pinMovedByHand,
    locationDisplay: value.display,
    geocodedAt: value.lat === null ? null : new Date(),
  };
}

export function columnsToLocation(row: EntryRow): LocationValue {
  return {
    ...emptyLocation(row.countryCode),
    onlineOnly: row.onlineOnly,
    addressText: row.addressText,
    lat: row.lat,
    lng: row.lng,
    city: row.city,
    precision: row.precision,
    source: row.locationSource,
    pinMovedByHand: row.pinMovedByHand,
    display: row.locationDisplay,
  };
}
