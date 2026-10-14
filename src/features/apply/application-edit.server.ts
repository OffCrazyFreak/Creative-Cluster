import { and, eq } from "drizzle-orm";

import { db } from "@/db/client.server";
import { entry } from "@/db/schema";
import { emptyLocation } from "@/features/location";
import { EMPTY_RICH_TEXT } from "@/lib/rich-text/empty-rich-text";

import type { RejectedApplication } from "./apply-schemas";
import { columnsToLocation } from "./application-location";
import { entryIdForToken } from "./application-tokens.server";

// Fills the form for a rejected application. Consent is never carried over: people tick it again.
export async function loadRejectedApplication(
  token: string,
): Promise<RejectedApplication | null> {
  const entryId = await entryIdForToken("apply-edit", token);
  if (!entryId) return null;
  const [row] = await db
    .select()
    .from(entry)
    .where(and(eq(entry.id, entryId), eq(entry.status, "rejected")))
    .limit(1);
  if (!row || (row.kind !== "organization" && row.kind !== "person"))
    return null;
  return {
    kind: row.kind,
    name: row.name,
    descriptionJson: JSON.stringify(row.description ?? EMPTY_RICH_TEXT),
    contactName: row.contactName ?? "",
    contactEmail: row.contactEmail ?? "",
    contactPhone: row.contactPhone ?? "",
    website: row.website ?? "",
    location: row.countryCode ? columnsToLocation(row) : emptyLocation(),
    consent: false,
    ageConfirmed: false,
  };
}
