import { and, eq, gt, ne, sql, type SQL } from "drizzle-orm";

import { entry, link, opportunity } from "@/db/schema";

// The one definition of "publicly visible": suspended, archived, pending and draft entries,
// and outside-partner stubs, never appear in any visitor-facing query.
export function publicEntryCondition(): SQL {
  return and(
    eq(entry.status, "published"),
    ne(entry.kind, "outside_partner"),
  ) as SQL;
}

// An opportunity is public only while its listing is: suspending or archiving the entry hides its posts too.
export function publicOpportunityCondition(): SQL {
  return and(
    eq(opportunity.status, "published"),
    gt(opportunity.expiresAt, sql`now()`),
    sql`exists (select 1 from ${entry} where ${entry.id} = ${opportunity.entryId} and ${publicEntryCondition()})`,
  ) as SQL;
}

// A connection is public only while both of its listings are.
export function publicLinkCondition(): SQL {
  return and(
    eq(link.status, "confirmed"),
    sql`exists (select 1 from ${entry} where ${entry.id} = ${link.fromId} and ${publicEntryCondition()})`,
    sql`exists (select 1 from ${entry} where ${entry.id} = ${link.toId} and ${publicEntryCondition()})`,
  ) as SQL;
}
