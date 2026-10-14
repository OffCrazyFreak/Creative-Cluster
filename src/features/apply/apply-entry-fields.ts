import { CONSENT_TEXT_VERSION } from "@/constants/apply";
import { emptyLocation } from "@/features/location";
import { applyPersonOffset } from "@/features/location/person-offset-fn.server";
import { findTown } from "@/features/location/town-lookup.server";

import type { ApplicationInput } from "./apply-schemas";
import { locationToColumns } from "./application-location";

export class InvalidTownError extends Error {}

// Everything about a person's place comes from the server's own town list; the browser only names the town.
async function personLocation(entryId: string, input: ApplicationInput) {
  const { city, countryCode, lat, lng } = input.location;
  const town =
    city && countryCode && lat !== null && lng !== null
      ? await findTown(countryCode, city, lat, lng)
      : null;
  if (!town) throw new InvalidTownError();
  return applyPersonOffset(entryId, {
    ...emptyLocation(town.countryCode),
    city: town.name,
    lat: town.lat,
    lng: town.lng,
    precision: "town",
    source: "town_list",
    display: "town",
    townPopulation: town.population,
  });
}

// People are stored at town level only: the offset pin replaces whatever the browser sent.
export async function applicationEntryFields(
  entryId: string,
  input: ApplicationInput,
) {
  const isPerson = input.kind === "person";
  const location = isPerson
    ? await personLocation(entryId, input)
    : input.location;
  return {
    kind: input.kind,
    name: input.name,
    description: input.description.doc,
    descriptionText: input.description.text,
    website: input.website,
    contactName: input.contactName || null,
    contactEmail: input.contactEmail.toLowerCase(),
    contactPhone: input.contactPhone || null,
    consentAt: isPerson ? new Date() : null,
    consentVersion: isPerson ? CONSENT_TEXT_VERSION : null,
    ...locationToColumns(location),
  };
}
