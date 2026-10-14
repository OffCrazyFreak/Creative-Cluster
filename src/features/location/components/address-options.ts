import type { GeoHit } from "@/lib/geocoding/types";

export interface IAddressOption {
  id: string;
  label: string;
  secondary: string;
  hit: GeoHit | null;
}

export const MANUAL_OPTION_ID = "manual";

export function toOptions(
  hits: GeoHit[],
  manualLabel: string,
): IAddressOption[] {
  return [
    ...hits.map((hit, index) => ({
      id: `${hit.source}-${index}-${hit.lat}-${hit.lng}`,
      label: hit.label,
      secondary: hit.secondary,
      hit,
    })),
    { id: MANUAL_OPTION_ID, label: manualLabel, secondary: "", hit: null },
  ];
}
