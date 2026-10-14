import { searchAddressOnce } from "@/features/location/location.server";

import type { StagingOrganization } from "./import-schemas";

export type GeocodeOutcome = "found" | "miss" | "skipped" | "failed";

// One lookup per organization. A hit fills the pin, city and country; anything else leaves the text for hand fixing.
export async function geocodeOrganization(
  org: StagingOrganization,
  defaultCountry: string | null,
): Promise<{ org: StagingOrganization; outcome: GeocodeOutcome }> {
  const text = org.location.addressText;
  const countryCode = org.location.countryCode ?? defaultCountry;
  // The search needs a country to pick providers, so rows without one wait for hand fixing.
  if (text.length < 3 || !countryCode) return { org, outcome: "skipped" };
  const { hits, degraded } = await searchAddressOnce({ text, countryCode });
  const hit = hits[0];
  // Every provider failing is "unknown", not "no such address".
  if (!hit) return { org, outcome: degraded ? "failed" : "miss" };
  return {
    outcome: "found",
    org: {
      ...org,
      location: {
        ...org.location,
        lat: hit.lat,
        lng: hit.lng,
        city: hit.city ?? org.location.city,
        countryCode: hit.countryCode,
        precision: hit.precision,
        source: hit.source,
      },
    },
  };
}
