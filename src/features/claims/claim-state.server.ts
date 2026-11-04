import { and, eq, isNull, sql } from "drizzle-orm";

import { claimInvite, entry } from "@/db/schema";

// Recheck the address because an admin may have corrected or cleared it since the invite was prepared.
export const openInviteCondition = and(
  isNull(claimInvite.usedAt),
  eq(entry.status, "published"),
  isNull(entry.ownerUserId),
  isNull(entry.erasureRequestedAt),
  eq(entry.contactEmailInvalid, false),
  sql`lower(btrim(${entry.contactEmail})) = ${claimInvite.email}`,
);
