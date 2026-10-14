import { searchAddressOnce } from "@/features/location/location.server";

import type { StagingOrganization } from "./import-schemas";

// One lookup per organization. A hit fills the pin, city and country; no hit leaves the text for hand fixing.
export async function geocodeOrganization(
  org: StagingOrganization,
  defaultCountry: string | null,
): Promise<{ org: StagingOrganization; found: boolean }> {
  const text = org.location.addressText;
  const countryCode = org.location.countryCode ?? defaultCountry;
  // The search needs a country to pick providers, so rows without one wait for hand fixing.
  if (text.length < 3 || !countryCode) return { org, found: false };
  const { hits } = await searchAddressOnce({ text, countryCode });
  const hit = hits[0];
  if (!hit) return { org, found: false };
  return {
    found: true,
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
