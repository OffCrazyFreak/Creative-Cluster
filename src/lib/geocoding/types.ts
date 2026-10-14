import type { LocationPrecision, LocationSource } from "@/constants/entry";

export interface GeoHit {
  label: string;
  secondary: string;
  lat: number;
  lng: number;
  city: string | null;
  // ISO 3166-1 alpha-2, upper case.
  countryCode: string;
  precision: LocationPrecision;
  source: LocationSource;
}

export interface IGeoQuery {
  text: string;
  countryCode?: string;
  limit?: number;
  signal?: AbortSignal;
}

export interface IReverseQuery {
  lat: number;
  lng: number;
  signal?: AbortSignal;
}

export interface Geocoder {
  id: LocationSource;
  // False skips the adapter, for example the Croatian table for a Portuguese query.
  covers?(countryCode: string | undefined): boolean;
  suggest?(query: IGeoQuery): Promise<GeoHit[]>;
  search(query: IGeoQuery): Promise<GeoHit[]>;
  reverse(query: IReverseQuery): Promise<GeoHit | null>;
}
