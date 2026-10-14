import { useQuery } from "@tanstack/react-query";

import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import type { LocationSource } from "@/constants/entry";
import type { GeoHit } from "@/lib/geocoding/types";

import { dguAttributionQueryOptions } from "../location-queries";

interface IAddressAttributionProps {
  countryCode?: string;
  hits: GeoHit[];
  // The stored value's source, so the credit stays after a hit is picked and the list clears.
  source: LocationSource | null;
}

// Licence credits (DGU open licence, OSM, Geoapify) must be visible wherever their data is shown.
export default function AddressAttribution({
  countryCode,
  hits,
  source,
}: IAddressAttributionProps) {
  const showDgu = countryCode?.toUpperCase() === "HR";
  const { data } = useQuery({
    ...dguAttributionQueryOptions(),
    enabled: showDgu,
  });
  const sources = new Set<LocationSource | null>([
    source,
    ...hits.map((hit) => hit.source),
  ]);
  const date = data
    ? new Date(data.downloadedAt).toLocaleDateString(getLocale())
    : "";

  return (
    <div className="flex flex-col gap-1 text-xs">
      {showDgu && date ? <p>{m.location_attribution_dgu({ date })}</p> : null}
      {sources.has("geoapify") ||
      sources.has("photon") ||
      sources.has("nominatim") ? (
        <p>{m.location_attribution_osm()}</p>
      ) : null}
      {sources.has("geoapify") ? (
        <p>
          <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">
            {m.location_attribution_geoapify()}
          </a>
        </p>
      ) : null}
    </div>
  );
}
