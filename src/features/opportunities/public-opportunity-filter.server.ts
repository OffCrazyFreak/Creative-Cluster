import { and, eq, gt, or, sql, type SQL } from "drizzle-orm";

import {
  OPPORTUNITY_FILLED_REASON,
  OPPORTUNITY_LIMITS as L,
} from "@/constants/opportunities";
import { opportunity } from "@/db/schema";
import { publicEntryCondition } from "@/features/entry/public-entry-filter.server";

import { activeOpportunityCondition } from "./opportunity-conditions.server";

function filledRecently(): SQL {
  return and(
    eq(opportunity.status, "closed"),
    eq(opportunity.closedReason, OPPORTUNITY_FILLED_REASON),
    gt(
      opportunity.closedAt,
      sql`now() - make_interval(days => ${L.filledLabelDays})`,
    ),
  ) as SQL;
}

// The one definition of "visible on the board": live posts and posts filled in the last week,
// of entries a visitor can see. Suspended entries take their posts down with them.
export function boardCondition(): SQL {
  return and(
    or(activeOpportunityCondition(), filledRecently()),
    publicEntryCondition(),
  ) as SQL;
}
