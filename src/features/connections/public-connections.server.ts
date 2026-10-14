import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db/client.server";
import { entry, link, linkEvidence } from "@/db/schema";
import { publicEntryCondition } from "@/features/entry/public-entry-filter.server";

import type {
  IPublicConnections,
  IPublicPartner,
  IUnverifiedPartner,
} from "./connections-schemas";

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
    .orderBy(desc(link.decidedAt), link.id);
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
    .orderBy(desc(link.createdAt), link.id);
  const evidence = rows.length
    ? await db
        .select({ linkId: linkEvidence.linkId, url: linkEvidence.url })
        .from(linkEvidence)
        .where(
          inArray(
            linkEvidence.linkId,
            rows.map((row) => row.linkId),
          ),
        )
    : [];
  return rows.map(({ fromId, ...row }) => ({
    ...row,
    direction: fromId === entryId ? "outgoing" : "incoming",
    evidence: evidence.filter((e) => e.linkId === row.linkId).map((e) => e.url),
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
