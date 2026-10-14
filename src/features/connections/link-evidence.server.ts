import { inArray } from "drizzle-orm";

import type { DbOrTx } from "@/db/client.server";
import { linkEvidence } from "@/db/schema";

export async function loadEvidenceByLink(
  db: DbOrTx,
  linkIds: string[],
): Promise<Map<string, string[]>> {
  const byLink = new Map<string, string[]>();
  if (linkIds.length === 0) return byLink;
  const rows = await db
    .select({ linkId: linkEvidence.linkId, url: linkEvidence.url })
    .from(linkEvidence)
    .where(inArray(linkEvidence.linkId, linkIds))
    .orderBy(linkEvidence.createdAt, linkEvidence.id);
  for (const { linkId, url } of rows)
    byLink.set(linkId, [...(byLink.get(linkId) ?? []), url]);
  return byLink;
}
