import { and, eq, inArray } from "drizzle-orm";

import type { AppLocale } from "@/constants/locales";
import type { Tx } from "@/db/client.server";
import { entry, opportunity, user } from "@/db/schema";
import { NotFoundError } from "@/server/errors";

export type OpportunityRow = typeof opportunity.$inferSelect;

export interface IOpportunityWithOwner {
  row: OpportunityRow;
  entryName: string;
  // Whether the next post of this entry is published without review.
  entryTrusted: boolean;
  owner: { email: string; locale: AppLocale } | null;
}

// Locks the post for the admin decision; the owner is the entry's account, if it still has one.
export async function lockOpportunityWithOwner(
  tx: Tx,
  id: string,
  statuses: OpportunityRow["status"][],
): Promise<IOpportunityWithOwner> {
  const [found] = await tx
    .select({
      row: opportunity,
      entryName: entry.name,
      entryTrusted: entry.trusted,
      email: user.email,
      locale: user.locale,
    })
    .from(opportunity)
    .innerJoin(entry, eq(entry.id, opportunity.entryId))
    .leftJoin(user, eq(user.id, entry.ownerUserId))
    .where(and(eq(opportunity.id, id), inArray(opportunity.status, statuses)))
    .for("update", { of: opportunity });
  if (!found) throw new NotFoundError();
  return {
    row: found.row,
    entryName: found.entryName,
    entryTrusted: found.entryTrusted,
    owner: found.email
      ? { email: found.email, locale: found.locale as AppLocale }
      : null,
  };
}
