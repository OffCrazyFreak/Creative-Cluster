import { and, eq, gt, inArray, sql, type SQL } from "drizzle-orm";

import { opportunity } from "@/db/schema";

// Expiry is a date comparison in every query, so no job has to close a post when it runs out.
export function activeOpportunityCondition(): SQL {
  return and(
    eq(opportunity.status, "published"),
    gt(opportunity.expiresAt, sql`now()`),
  ) as SQL;
}

// Counts toward the per-entry cap: waiting for review, or live and not yet expired.
export function openOpportunityCondition(): SQL {
  return and(
    inArray(opportunity.status, ["pending", "published"]),
    gt(opportunity.expiresAt, sql`now()`),
  ) as SQL;
}
