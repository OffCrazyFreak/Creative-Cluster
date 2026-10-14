import { and, eq, sql } from "drizzle-orm";

import type { AppLocale } from "@/constants/locales";
import type { Tx } from "@/db/client.server";
import { entry, opportunity, user } from "@/db/schema";
import { NotFoundError } from "@/server/errors";

export type OpportunityRow = typeof opportunity.$inferSelect;

export interface IOpportunityWithOwner {
  row: OpportunityRow;
  entryName: string;
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
      email: user.email,
      locale: user.locale,
    })
    .from(opportunity)
    .innerJoin(entry, eq(entry.id, opportunity.entryId))
    .leftJoin(user, eq(user.id, entry.ownerUserId))
    .where(
      and(
        eq(opportunity.id, id),
        sql`${opportunity.status} in (${sql.join(
          statuses.map((status) => sql`${status}`),
          sql`, `,
        )})`,
      ),
    )
    .for("update", { of: opportunity });
  if (!found) throw new NotFoundError();
  return {
    row: found.row,
    entryName: found.entryName,
    owner: found.email
      ? { email: found.email, locale: found.locale as AppLocale }
      : null,
  };
}
