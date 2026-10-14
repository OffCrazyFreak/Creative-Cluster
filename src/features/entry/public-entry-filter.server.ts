import { and, eq, ne, type SQL } from "drizzle-orm";

import { entry } from "@/db/schema";

// The one definition of "publicly visible": suspended, archived, pending and draft entries,
// and outside-partner stubs, never appear in any visitor-facing query.
export function publicEntryCondition(): SQL {
  return and(
    eq(entry.status, "published"),
    ne(entry.kind, "outside_partner"),
  ) as SQL;
}
