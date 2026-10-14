import { findPublicEntryId } from "@/features/entry/public-entry.server";

import { loadPartners } from "./public-connections.server";

// Slugs only: the map already holds every public pin, so coordinates never travel twice.
export async function connectionPartnerSlugs(slug: string): Promise<string[]> {
  const found = await findPublicEntryId(slug);
  if (!found) return [];
  return (await loadPartners(found.id)).map((partner) => partner.slug);
}
