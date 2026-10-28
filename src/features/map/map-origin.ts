import type { IPoint } from "./map-search";

// Android and iOS "approximate" grants are 2 km or coarser: that pins a town, not a street,
// so a kilometre figure would claim more than it knows.
const PRECISE_WITHIN_M = 2_000;

export interface IMapOrigin {
  // What the list is sorted from.
  point: IPoint;
  showDistances: boolean;
}

// GPS beats the IP guess; a guess sorts the list but never shows kilometres.
export function resolveMapOrigin(
  gps: (IPoint & { accuracy: number }) | null,
  ip: IPoint | null,
): IMapOrigin | null {
  if (gps)
    return {
      point: { lat: gps.lat, lng: gps.lng },
      showDistances: gps.accuracy <= PRECISE_WITHIN_M,
    };
  if (ip) return { point: ip, showDistances: false };
  return null;
}
