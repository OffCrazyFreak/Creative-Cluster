import { and, eq, isNull, sql } from "drizzle-orm";

import { claimInvite, entry } from "@/db/schema";

// Mail only while live, unclaimed, deliverable and at the invited address, which an admin may have changed.
export const openInviteCondition = and(
  isNull(claimInvite.usedAt),
  eq(entry.status, "published"),
  isNull(entry.ownerUserId),
  isNull(entry.erasureRequestedAt),
  eq(entry.contactEmailInvalid, false),
  sql`lower(btrim(${entry.contactEmail})) = ${claimInvite.email}`,
);
