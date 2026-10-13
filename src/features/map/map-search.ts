import { isKnownCountry } from "@/features/directory/country-name";
import { z } from "zod";

// TanStack parses `?q=2024` as a number, so every text value accepts both and falls back to "".
const text = z
  .union([z.string(), z.number()])
  .optional()
  .transform((value) => (value === undefined ? "" : String(value)))
  .catch("");

export const MAP_SEARCH_DEFAULTS = {
  q: "",
  tags: "",
  country: "",
  legal: "",
  near: "",
  radius: 0,
  v: "",
} as const;

export const mapSearchSchema = z.object({
  q: text,
  tags: text,
  country: text,
  legal: text,
  near: text,
  radius: z.coerce
    .number()
    .min(0)
    .max(2000)
    .optional()
    .transform((value) => value ?? 0)
    .catch(0),
  v: text,
});
export type MapSearch = z.infer<typeof mapSearchSchema>;

export interface IPoint {
  lat: number;
  lng: number;
}

export interface IViewport extends IPoint {
  zoom: number;
}

export interface IMapFilters {
  q: string;
  tags: string[];
  country: string;
  legal: string;
  near: IPoint | null;
  radiusKm: number;
}

function parseNumbers(value: string, count: number): number[] | null {
  const raw = value.split(",");
  // Number("") is 0, so empty segments must be rejected before converting.
  if (raw.some((part) => part.trim() === "")) return null;
  const parts = raw.map(Number);
  return parts.length === count && parts.every(Number.isFinite) ? parts : null;
}

export function parsePoint(value: string): IPoint | null {
  const parts = parseNumbers(value, 2);
  if (!parts) return null;
  const [lat, lng] = parts;
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

export function formatPoint({ lat, lng }: IPoint): string {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

export function parseViewport(value: string): IViewport | null {
  const parts = parseNumbers(value, 3);
  if (!parts) return null;
  const [lat, lng, zoom] = parts;
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && zoom >= 0 && zoom <= 24
    ? { lat, lng, zoom }
    : null;
}

export function formatViewport({ lat, lng, zoom }: IViewport): string {
  return `${lat.toFixed(4)},${lng.toFixed(4)},${zoom.toFixed(2)}`;
}

export function toFilters(search: MapSearch): IMapFilters {
  const near = parsePoint(search.near);
  return {
    q: search.q.trim(),
    tags: search.tags ? search.tags.split(",").filter(Boolean) : [],
    country: isKnownCountry(search.country) ? search.country.toUpperCase() : "",
    legal: search.legal,
    near,
    radiusKm: near ? search.radius : 0,
  };
}

export function hasActiveFilters(search: MapSearch): boolean {
  return Boolean(
    search.q ||
    search.tags ||
    search.country ||
    search.legal ||
    (search.near && search.radius),
  );
}
