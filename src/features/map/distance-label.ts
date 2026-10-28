import type { IDirectoryEntry } from "@/features/directory/directory-schemas";

import { distanceKm } from "./geo";
import type { IMapOrigin } from "./map-origin";

function format(value: number, unit: "meter" | "kilometer", locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit,
    maximumFractionDigits: 1,
  }).format(value);
}

// "350 m" under a kilometre, "4.2 km" under ten, "37 km" beyond.
export function formatDistance(km: number, locale: string): string {
  if (km < 1)
    return format(Math.max(10, Math.round(km * 100) * 10), "meter", locale);
  if (km < 10) return format(Math.round(km * 10) / 10, "kilometer", locale);
  return format(Math.round(km), "kilometer", locale);
}

// A person's pin is offset to the town for privacy, so a figure would claim more than it knows.
export function distanceLabel(
  entry: IDirectoryEntry,
  origin: IMapOrigin | null,
  locale: string,
): string | null {
  if (!origin?.showDistances || entry.kind === "person") return null;
  if (entry.lat === null || entry.lng === null) return null;
  return formatDistance(
    distanceKm(origin.point, { lat: entry.lat, lng: entry.lng }),
    locale,
  );
}
