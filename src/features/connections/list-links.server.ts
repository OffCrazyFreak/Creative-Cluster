import { and, desc, eq, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { LINK_LIMITS } from "@/constants/links";
import { db } from "@/db/client.server";
import { entry, link, linkEvidence } from "@/db/schema";
import { publicEntryCondition } from "@/features/entry/public-entry-filter.server";

import type {
  IConnectionItem,
  ILinkEntryRef,
  IMyConnections,
} from "./connections-schemas";
import { isLiveLink, recipientEntryId } from "./link-conditions.server";

const fromEntry = alias(entry, "from_entry");
const toEntry = alias(entry, "to_entry");

function refOf(row: typeof entry.$inferSelect): ILinkEntryRef {
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
  selfOf: (from: ILinkEntryRef, proposedById: string | null) => "from" | "to",
): Promise<IConnectionItem[]> {
  const rows = await db
    .select({ link, from: fromEntry, to: toEntry })
    .from(link)
    .innerJoin(fromEntry, eq(fromEntry.id, link.fromId))
    .innerJoin(toEntry, eq(toEntry.id, link.toId))
    .where(and(isLiveLink(), where))
    .orderBy(desc(link.createdAt));
  const evidence = rows.length
    ? await db
        .select({ linkId: linkEvidence.linkId, url: linkEvidence.url })
        .from(linkEvidence)
        .where(
          inArray(
            linkEvidence.linkId,
            rows.map((row) => row.link.id),
          ),
        )
    : [];
  return rows.map(({ link: row, from, to }) => {
    const [fromRef, toRef] = [refOf(from), refOf(to)];
    const selfSide = selfOf(fromRef, row.proposedByEntryId);
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
        row.createdAt.getTime() + LINK_LIMITS.autoWithdrawDays * 86_400_000,
      ).toISOString(),
      evidence: evidence.filter((e) => e.linkId === row.id).map((e) => e.url),
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
  const ownedIds = new Set(mine.map((row) => row.id));
  const items = await loadItems(
    or(eq(fromEntry.ownerUserId, userId), eq(toEntry.ownerUserId, userId)),
    (from) => (ownedIds.has(from.id) ? "from" : "to"),
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
        eq(entry.ownerUserId, userId),
      ),
    );
  return row?.count ?? 0;
}

// Proposals addressed to listings nobody has claimed yet; an admin may decide for them.
export function listUnclaimedWaiting(): Promise<IConnectionItem[]> {
  const recipientOwner = sql`case when ${link.proposedByEntryId} = ${link.fromId} then ${toEntry.ownerUserId} else ${fromEntry.ownerUserId} end`;
  return loadItems(
    and(eq(link.status, "proposed"), sql`${recipientOwner} is null`),
    (from, proposedById) => (from.id === proposedById ? "to" : "from"),
  );
}
