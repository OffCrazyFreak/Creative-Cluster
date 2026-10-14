import { and, asc, eq, ilike, or, sql, type SQL } from "drizzle-orm";

import { LINK_LIMITS } from "@/constants/links";
import { db } from "@/db/client.server";
import { link } from "@/db/schema";
import { escapeLike } from "@/utils/escape-like";

import {
  ADMIN_LINKS_PAGE_SIZE,
  type AdminLinksSearch,
  type IAdminLinksPage,
} from "./admin-links-schemas";
import { DAY_MS, isLiveLink } from "./link-conditions.server";
import {
  fromEntry,
  recipientOwnerId,
  refOf,
  toEntry,
} from "./list-links.server";

function filters(input: AdminLinksSearch): SQL {
  const conditions: SQL[] = [eq(link.status, "proposed"), isLiveLink()];
  if (input.kind) conditions.push(eq(link.kind, input.kind));
  if (input.unclaimed) conditions.push(sql`${recipientOwnerId} is null`);
  if (input.q) {
    const pattern = `%${escapeLike(input.q)}%`;
    conditions.push(
      or(ilike(fromEntry.name, pattern), ilike(toEntry.name, pattern)) as SQL,
    );
  }
  return and(...conditions) as SQL;
}

// Every live proposal, oldest first because those are the closest to the automatic withdrawal.
export async function listAdminProposedLinks(
  input: AdminLinksSearch,
  adminId: string,
): Promise<IAdminLinksPage> {
  const where = filters(input);
  const [rows, [totals]] = await Promise.all([
    db
      .select({ link, from: fromEntry, to: toEntry })
      .from(link)
      .innerJoin(fromEntry, eq(fromEntry.id, link.fromId))
      .innerJoin(toEntry, eq(toEntry.id, link.toId))
      .where(where)
      .orderBy(asc(link.createdAt), asc(link.id))
      .limit(ADMIN_LINKS_PAGE_SIZE)
      .offset((input.page - 1) * ADMIN_LINKS_PAGE_SIZE),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(link)
      .innerJoin(fromEntry, eq(fromEntry.id, link.fromId))
      .innerJoin(toEntry, eq(toEntry.id, link.toId))
      .where(where),
  ]);
  return {
    rows: rows.map(({ link: row, from, to }) => {
      const proposerIsFrom = row.proposedByEntryId === from.id;
      const [proposer, recipient] = proposerIsFrom ? [from, to] : [to, from];
      return {
        id: row.id,
        kind: row.kind,
        createdAt: row.createdAt.toISOString(),
        expiresAt: new Date(
          row.createdAt.getTime() + LINK_LIMITS.autoWithdrawDays * DAY_MS,
        ).toISOString(),
        proposer: refOf(proposer),
        recipient: refOf(recipient),
        direction: proposerIsFrom ? "outgoing" : "incoming",
        canDecide: recipient.ownerUserId === null && row.proposedBy !== adminId,
      };
    }),
    total: totals.total,
    pageSize: ADMIN_LINKS_PAGE_SIZE,
  };
}
