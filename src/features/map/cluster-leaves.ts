import type { IMapPadding } from "./map-padding";

export interface IClusterLeaf {
  slug: string;
  lng: number;
  lat: number;
  person: boolean;
}

// About 20 m: geocoded addresses in one building land this close or on the very same point, and
// no zoom level separates them on screen.
const SAME_SPOT_DEGREES = 0.0002;
const FIT_MARGIN = 64;
// A person's pin sits about 1 km from where they are, so a fit never zooms in far enough to
// make that offset point look like an address.
export const PERSON_MAX_FIT_ZOOM = 13;

export function toLeaf(feature: {
  geometry: { type: string; coordinates?: unknown };
  properties: Record<string, unknown> | null;
}): IClusterLeaf | null {
  const slug = feature.properties?.slug;
  if (typeof slug !== "string" || feature.geometry.type !== "Point")
    return null;
  const [lng, lat] = feature.geometry.coordinates as [number, number];
  return { slug, lng, lat, person: feature.properties?.person === true };
}

export function isSameSpot(leaves: IClusterLeaf[]): boolean {
  const lngs = leaves.map((leaf) => leaf.lng);
  const lats = leaves.map((leaf) => leaf.lat);
  return (
    Math.max(...lngs) - Math.min(...lngs) < SAME_SPOT_DEGREES &&
    Math.max(...lats) - Math.min(...lats) < SAME_SPOT_DEGREES
  );
}

export function leafBounds(
  leaves: IClusterLeaf[],
): [[number, number], [number, number]] {
  const lngs = leaves.map((leaf) => leaf.lng);
  const lats = leaves.map((leaf) => leaf.lat);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

// Room around a stack's entries when zooming to them, clear of the panel and the phone sheet.
// MapLibre refuses to move when the padding outgrows the canvas, as it can on a phone in
// landscape, so the margin shrinks to fit.
export function fitPadding(
  width: number,
  height: number,
  covered: IMapPadding,
): IMapPadding {
  const freeWidth = Math.max(0, width - covered.left - covered.right);
  const freeHeight = Math.max(0, height - covered.top - covered.bottom);
  const margin = Math.min(FIT_MARGIN, freeWidth / 4, freeHeight / 4);
  return {
    top: covered.top + margin,
    right: covered.right + margin,
    bottom: covered.bottom + margin,
    left: covered.left + margin,
  };
}
