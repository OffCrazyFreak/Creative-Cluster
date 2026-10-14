import type { LocationPrecision } from "@/constants/entry";

export interface IGeoapifyProps {
  result_type?: string;
  housenumber?: string;
  rank?: { confidence_building_level?: number; match_type?: string };
}

// null means "not an address or a place": the hit is dropped, never offered.
export function geoapifyPrecision(
  props: IGeoapifyProps,
): LocationPrecision | null {
  const building = props.rank?.confidence_building_level ?? 0;
  switch (props.result_type) {
    case "building":
    case "amenity":
      return building >= 0.5 || props.housenumber ? "house" : "street";
    case "street":
      return "street";
    case "suburb":
    case "district":
    case "postcode":
    case "city":
      return "town";
    default:
      return null;
  }
}

export interface IPhotonProps {
  type?: string;
  osm_key?: string;
  osm_value?: string;
}

const PHOTON_REJECT_KEYS = new Set(["waterway", "natural", "public_transport"]);
const PHOTON_REJECT_VALUES = new Set(["bus_stop", "bus_station", "platform"]);

export function photonPrecision(props: IPhotonProps): LocationPrecision | null {
  if (props.osm_key && PHOTON_REJECT_KEYS.has(props.osm_key)) return null;
  if (props.osm_value && PHOTON_REJECT_VALUES.has(props.osm_value)) return null;
  switch (props.type) {
    case "house":
      return "house";
    case "street":
      return "street";
    case "locality":
    case "district":
    case "city":
      return "town";
    default:
      return null;
  }
}

export function nominatimPrecision(
  placeRank: number,
): LocationPrecision | null {
  if (placeRank >= 26) return "house";
  if (placeRank >= 22) return "street";
  if (placeRank >= 16) return "town";
  return null;
}
