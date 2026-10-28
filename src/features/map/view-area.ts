import type { Map as MapLibreMap } from "maplibre-gl";

import type { IMapPadding } from "./map-padding";
import type { IPoint } from "./map-search";

// The visible map as four [lng, lat] corners, in order around the edge.
export interface IViewArea {
  corners: [number, number][];
}

interface ILocated {
  lat: number | null;
  lng: number | null;
}

export function sameView(a: IViewArea | null, b: IViewArea | null): boolean {
  if (!a || !b) return a === b;
  return a.corners.every(
    ([lng, lat], index) =>
      lng === b.corners[index][0] && lat === b.corners[index][1],
  );
}

// The part of the map not hidden under the panel, the search block or the phone sheet.
export function readVisibleArea(
  map: MapLibreMap,
  covered: IMapPadding,
): IViewArea | null {
  const { clientWidth, clientHeight } = map.getCanvas();
  const right = clientWidth - covered.right;
  const bottom = clientHeight - covered.bottom;
  if (right <= covered.left || bottom <= covered.top) return null;
  // All four corners, not a north-aligned box around them: on a rotated map that box reaches
  // past the screen and would count hidden entries.
  const corners = [
    map.unproject([covered.left, covered.top]),
    map.unproject([right, covered.top]),
    map.unproject([right, bottom]),
    map.unproject([covered.left, bottom]),
  ];
  return { corners: corners.map(({ lng, lat }) => [lng, lat]) };
}

// Inside a convex shape means on the same side of every edge.
function isInView(point: IPoint, { corners }: IViewArea): boolean {
  let side = 0;
  for (const [index, [lng1, lat1]] of corners.entries()) {
    const [lng2, lat2] = corners[(index + 1) % corners.length];
    const cross =
      (lng2 - lng1) * (point.lat - lat1) - (lat2 - lat1) * (point.lng - lng1);
    if (cross === 0) continue;
    if (side === 0) side = Math.sign(cross);
    else if (Math.sign(cross) !== side) return false;
  }
  return true;
}

// Entries on the visible map, then the rest, each keeping the list's order.
export function splitByView<T extends ILocated>(
  entries: T[],
  view: IViewArea | null,
): { onMap: T[]; elsewhere: T[] } {
  if (!view) return { onMap: [], elsewhere: entries };
  const onMap: T[] = [];
  const elsewhere: T[] = [];
  for (const entry of entries) {
    const placed =
      entry.lat !== null &&
      entry.lng !== null &&
      isInView({ lat: entry.lat, lng: entry.lng }, view);
    (placed ? onMap : elsewhere).push(entry);
  }
  return { onMap, elsewhere };
}
