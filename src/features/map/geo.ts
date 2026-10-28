import type { IPoint } from "./map-search";

const EARTH_RADIUS_KM = 6371;

function rad(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function distanceKm(a: IPoint, b: IPoint): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}
