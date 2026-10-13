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

// People are stored at an offset town point already. Everyone else is rounded to about 1 km
// unless the entry shows its exact place AND the viewer may see the address, so a hidden
// address cannot be read back from the pin.
export function publicLocation(
  row: ILocationRow,
  isMember: boolean,
): IPublicLocation {
  const townOnly = row.kind === "person" || row.locationDisplay === "town";
  const addressVisible = canSeeField(row.visibility, "address", isMember);
  const hasPin = !row.onlineOnly && row.lat !== null && row.lng !== null;
  function pin(value: number) {
    if (row.kind === "person" || (!townOnly && addressVisible)) return value;
    return Math.round(value * 100) / 100;
  }

  return {
    onlineOnly: row.onlineOnly,
    city: row.city,
    countryCode: row.countryCode?.toUpperCase() ?? null,
    addressText: !townOnly && addressVisible ? row.addressText : null,
    lat: hasPin ? pin(row.lat as number) : null,
    lng: hasPin ? pin(row.lng as number) : null,
    townOnly,
  };
}
