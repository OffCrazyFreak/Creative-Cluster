const EARTH_RADIUS_M = 6_371_000;
function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export interface ILatLng {
  lat: number;
  lng: number;
}

export function haversineMeters(a: ILatLng, b: ILatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function nudgeMeters(
  point: ILatLng,
  northMeters: number,
  eastMeters: number,
): ILatLng {
  const dLat = northMeters / 111_320;
  const dLng = eastMeters / (111_320 * Math.cos(toRad(point.lat)));
  return { lat: point.lat + dLat, lng: point.lng + dLng };
}
