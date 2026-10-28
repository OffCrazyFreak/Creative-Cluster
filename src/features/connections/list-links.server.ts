import { and, desc, eq, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { LINK_LIMITS } from "@/constants/links";
import { db } from "@/db/client.server";
import { entry, link } from "@/db/schema";
import { publicEntryCondition } from "@/features/entry/public-entry-filter.server";

import type {
  IConnectionItem,
  ILinkEntryRef,
  IMyConnections,
} from "./connections-schemas";
import {
  DAY_MS,
  isLiveLink,
  linkEndsPublic,
  recipientEntryId,
} from "./link-conditions.server";
import { loadEvidenceByLink } from "./link-evidence.server";

export const fromEntry = alias(entry, "from_entry");
export const toEntry = alias(entry, "to_entry");

// The owner of the entry that has to decide; null while that listing is unclaimed.
export const recipientOwnerId = sql`case when ${link.proposedByEntryId} = ${link.fromId} then ${toEntry.ownerUserId} else ${fromEntry.ownerUserId} end`;

export function refOf(row: typeof entry.$inferSelect): ILinkEntryRef {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    kind: row.kind,
    website: row.website,
    unclaimed: row.ownerUserId === null,
  };
}

async function loadItems(
  where: SQL | undefined,
  selfOf: (
    from: typeof entry.$inferSelect,
    proposedById: string | null,
  ) => "from" | "to",
): Promise<IConnectionItem[]> {
  const rows = await db
    .select({ link, from: fromEntry, to: toEntry })
    .from(link)
    .innerJoin(fromEntry, eq(fromEntry.id, link.fromId))
    .innerJoin(toEntry, eq(toEntry.id, link.toId))
    // Confirmed links stay listed so either side can still end them; proposals need both ends public.
    .where(
      and(
        isLiveLink(),
        or(ne(link.status, "proposed"), linkEndsPublic()),
        where,
      ),
    )
    .orderBy(desc(link.createdAt));
  const evidence = await loadEvidenceByLink(
    db,
    rows.map((row) => row.link.id),
  );
  return rows.map(({ link: row, from, to }) => {
    const [fromRef, toRef] = [refOf(from), refOf(to)];
    const selfSide = selfOf(from, row.proposedByEntryId);
    const self = selfSide === "from" ? fromRef : toRef;
    return {
      id: row.id,
      kind: row.kind,
      status: row.status,
      year: row.year,
      endYear: row.endYear,
      project: row.project,
      note: row.note,
      createdAt: row.createdAt.toISOString(),
      expiresAt: new Date(
        row.createdAt.getTime() + LINK_LIMITS.autoWithdrawDays * DAY_MS,
      ).toISOString(),
      evidence: evidence.get(row.id) ?? [],
      direction: selfSide === "from" ? "outgoing" : "incoming",
      role: row.proposedByEntryId === self.id ? "proposer" : "recipient",
      self,
      other: selfSide === "from" ? toRef : fromRef,
    };
  });
}

export async function listMyConnections(
  userId: string,
): Promise<IMyConnections> {
  const mine = await db
    .select({ id: entry.id, name: entry.name })
    .from(entry)
    .where(
      and(
        eq(entry.ownerUserId, userId),
        publicEntryCondition(),
        isNull(entry.erasureRequestedAt),
      ),
    )
    .orderBy(entry.name);
  const items = await loadItems(
    or(eq(fromEntry.ownerUserId, userId), eq(toEntry.ownerUserId, userId)),
    (from) => (from.ownerUserId === userId ? "from" : "to"),
  );
  return { entries: mine, items };
}

export async function countPendingProposals(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(link)
    .innerJoin(entry, eq(entry.id, recipientEntryId))
    .where(
      and(
        eq(link.status, "proposed"),
        isLiveLink(),
        linkEndsPublic(),
        eq(entry.ownerUserId, userId),
      ),
    );
  return row?.count ?? 0;
}

// Proposals addressed to listings nobody has claimed yet; an admin may decide for them, except
// for proposals the admin made, which would otherwise be confirmed by one person alone.
export function listUnclaimedWaiting(
  adminId: string,
): Promise<IConnectionItem[]> {
  return loadItems(
    and(
      eq(link.status, "proposed"),
      sql`${recipientOwnerId} is null`,
      or(isNull(link.proposedBy), ne(link.proposedBy, adminId)),
    ),
    (from, proposedById) => (from.id === proposedById ? "to" : "from"),
  );
}
