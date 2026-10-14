import { and, eq, isNull, sql } from "drizzle-orm";

import { claimInvite, entry } from "@/db/schema";

// An invite is worth mailing only while its listing is live, unclaimed, deliverable and still has the
// address the invite was made for (an admin may have corrected or cleared it since preparing).
export const openInviteCondition = and(
  isNull(claimInvite.usedAt),
  eq(entry.status, "published"),
  isNull(entry.ownerUserId),
  isNull(entry.erasureRequestedAt),
  eq(entry.contactEmailInvalid, false),
  sql`lower(btrim(${entry.contactEmail})) = ${claimInvite.email}`,
);
