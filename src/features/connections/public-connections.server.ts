import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db/client.server";
import { entry, link } from "@/db/schema";
import { loadEvidenceByLink } from "./link-evidence.server";
import { publicEntryCondition } from "@/features/entry/public-entry-filter.server";

import type {
  IPublicConnections,
  IPublicPartner,
  IUnverifiedPartner,
} from "./connections-schemas";

// A hub entry could have thousands of links; the page needs a readable list, not all of them.
const MAX_PUBLIC_LINKS = 200;

// The other end of each link, whichever column it is stored in.
function otherEnd(entryId: string) {
  return sql`case when ${link.fromId} = ${entryId} then ${link.toId} else ${link.fromId} end`;
}

async function loadPartners(entryId: string): Promise<IPublicPartner[]> {
  // publicEntryCondition on the partner is what hides links of suspended or archived entries.
  const rows = await db
    .select({
      linkId: link.id,
      entryId: entry.id,
      kind: link.kind,
      fromId: link.fromId,
      year: link.year,
      endYear: link.endYear,
      project: link.project,
      slug: entry.slug,
      name: entry.name,
      city: entry.city,
      countryCode: entry.countryCode,
    })
    .from(link)
    .innerJoin(entry, eq(entry.id, otherEnd(entryId)))
    .where(
      and(
        eq(link.status, "confirmed"),
        sql`${entryId} in (${link.fromId}, ${link.toId})`,
        publicEntryCondition(),
      ),
    )
    .orderBy(sql`${link.decidedAt} desc nulls last`, link.id)
    .limit(MAX_PUBLIC_LINKS);
  return rows.map(({ fromId, ...row }) => ({
    ...row,
    direction: fromId === entryId ? "outgoing" : "incoming",
  }));
}

async function loadUnverified(entryId: string): Promise<IUnverifiedPartner[]> {
  const rows = await db
    .select({
      linkId: link.id,
      kind: link.kind,
      fromId: link.fromId,
      year: link.year,
      endYear: link.endYear,
      project: link.project,
      name: entry.name,
      website: entry.website,
    })
    .from(link)
    .innerJoin(entry, eq(entry.id, otherEnd(entryId)))
    .where(
      and(
        eq(link.status, "confirmed"),
        eq(link.proposedByEntryId, entryId),
        eq(entry.kind, "outside_partner"),
      ),
    )
    .orderBy(sql`${link.createdAt} desc`, link.id)
    .limit(MAX_PUBLIC_LINKS);
  const evidence = await loadEvidenceByLink(
    db,
    rows.map((row) => row.linkId),
  );
  return rows.map(({ fromId, ...row }) => ({
    ...row,
    direction: fromId === entryId ? "outgoing" : "incoming",
    evidence: evidence.get(row.linkId) ?? [],
  }));
}

export async function loadPublicConnections(
  entryId: string,
): Promise<IPublicConnections> {
  const [self] = await db
    .select({ id: entry.id, name: entry.name })
    .from(entry)
    .where(and(eq(entry.id, entryId), publicEntryCondition()))
    .limit(1);
  if (!self) return { partners: [], unverified: [] };
  const [partners, unverified] = await Promise.all([
    loadPartners(entryId),
    loadUnverified(entryId),
  ]);
  return { partners, unverified };
}
