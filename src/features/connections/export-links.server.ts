import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import Papa from "papaparse";

import { db } from "@/db/client.server";
import { entry, link, linkEvidence } from "@/db/schema";

const fromEntry = alias(entry, "from_entry");
const toEntry = alias(entry, "to_entry");

// Same rule as publicEntryCondition, but on the two aliased ends, with the outside-partner stub
// allowed on the end that is not the proposer's.
function published(side: typeof fromEntry | typeof toEntry) {
  return and(
    eq(side.status, "published"),
    sql`${side.kind} <> 'outside_partner'`,
  );
}

export async function exportConfirmedLinks(): Promise<string> {
  const rows = await db
    .select({
      link,
      fromSlug: fromEntry.slug,
      fromName: fromEntry.name,
      toSlug: toEntry.slug,
      toName: toEntry.name,
      outside: sql<boolean>`(${fromEntry.kind} = 'outside_partner' or ${toEntry.kind} = 'outside_partner')`,
    })
    .from(link)
    .innerJoin(fromEntry, eq(fromEntry.id, link.fromId))
    .innerJoin(toEntry, eq(toEntry.id, link.toId))
    .where(
      and(
        eq(link.status, "confirmed"),
        or(
          and(published(fromEntry), published(toEntry)),
          and(published(fromEntry), eq(toEntry.kind, "outside_partner")),
          and(published(toEntry), eq(fromEntry.kind, "outside_partner")),
        ),
      ),
    )
    .orderBy(asc(link.createdAt), asc(link.id));
  const evidence = rows.length
    ? await db
        .select({ linkId: linkEvidence.linkId, url: linkEvidence.url })
        .from(linkEvidence)
        .where(
          inArray(
            linkEvidence.linkId,
            rows.map((row) => row.link.id),
          ),
        )
    : [];

  return Papa.unparse(
    rows.map((row) => ({
      link_id: row.link.id,
      kind: row.link.kind,
      from_slug: row.fromSlug,
      from_name: row.fromName,
      to_slug: row.toSlug,
      to_name: row.toName,
      symmetric: row.link.symmetric,
      year: row.link.year ?? "",
      end_year: row.link.endYear ?? "",
      project: row.link.project ?? "",
      unverified: row.outside,
      evidence_urls: evidence
        .filter((e) => e.linkId === row.link.id)
        .map((e) => e.url)
        .join(" "),
      confirmed_at: row.link.decidedAt?.toISOString() ?? "",
    })),
    // Cells starting with = + - @ would run as formulas in a spreadsheet; the library prefixes them.
    { escapeFormulae: true, newline: "\r\n" },
  );
}
