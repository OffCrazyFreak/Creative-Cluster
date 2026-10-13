import type { IPublicLocation } from "./entry-schemas";
import { canSeeField, type VisibilityMap } from "./entry-visibility";

export interface ILocationRow {
  kind: string;
  onlineOnly: boolean;
  city: string | null;
  countryCode: string | null;
  addressText: string | null;
  lat: number | null;
  lng: number | null;
  locationDisplay: string;
  visibility: VisibilityMap;
}

// People are stored at an offset town point already; organizations that chose "town"
// are rounded to about 1 km so the street never leaks through the coordinates.
export function publicLocation(
  row: ILocationRow,
  isMember: boolean,
): IPublicLocation {
  const townOnly = row.kind === "person" || row.locationDisplay === "town";
  const hasPin = !row.onlineOnly && row.lat !== null && row.lng !== null;
  function round(value: number) {
    return row.kind === "person" ? value : Math.round(value * 100) / 100;
  }

  return {
    onlineOnly: row.onlineOnly,
    city: row.city,
    countryCode: row.countryCode?.toUpperCase() ?? null,
    addressText:
      !townOnly && canSeeField(row.visibility, "address", isMember)
        ? row.addressText
        : null,
    lat: hasPin ? (townOnly ? round(row.lat as number) : row.lat) : null,
    lng: hasPin ? (townOnly ? round(row.lng as number) : row.lng) : null,
    townOnly,
  };
}
