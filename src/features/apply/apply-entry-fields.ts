import { CONSENT_TEXT_VERSION } from "@/constants/apply";
import { applyPersonOffset } from "@/features/location/person-offset-fn.server";

import type { ApplicationInput } from "./apply-schemas";
import { locationToColumns } from "./application-location";

// People are stored at town level only: the offset pin replaces whatever the browser sent.
export function applicationEntryFields(
  entryId: string,
  input: ApplicationInput,
) {
  const isPerson = input.kind === "person";
  const location = isPerson
    ? applyPersonOffset(entryId, input.location)
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
