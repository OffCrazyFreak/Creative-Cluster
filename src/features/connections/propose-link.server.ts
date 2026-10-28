import { and, eq, isNull, ne } from "drizzle-orm";

import { LINK_LIMITS } from "@/constants/links";
import { db, type Tx } from "@/db/client.server";
import { entry, link, linkEvidence } from "@/db/schema";
import { publicEntryCondition } from "@/features/entry/public-entry-filter.server";
import { writeChange } from "@/lib/change-log/write-change.server";
import { triggerDrain } from "@/lib/jobs/trigger-drain.server";
import { enforceLimits } from "@/lib/limits/check-limit.server";
import { LimitError, NotFoundError } from "@/server/errors";

import { assertLinkFree } from "./assert-link-free.server";
import type {
  ProposeLinkInput,
  ProposeLinkResult,
} from "./connections-schemas";
import { withdrawStaleProposals } from "./expire-links.server";
import { orientLink } from "./orient-link";
import { findOrCreateOutsidePartner } from "./outside-partner.server";
import { queueProposalEmail } from "./proposal-email.server";
import { ProposeRefused } from "./propose-refused";

const DAY_SECONDS = 24 * 60 * 60;

async function findProposerEntry(
  tx: Tx,
  input: ProposeLinkInput,
  userId: string,
) {
  const [mine] = await tx
    .select({
      id: entry.id,
      name: entry.name,
      sourceLocale: entry.sourceLocale,
    })
    .from(entry)
    .where(
      and(
        eq(entry.id, input.fromEntryId),
        eq(entry.ownerUserId, userId),
        isNull(entry.erasureRequestedAt),
        publicEntryCondition(),
      ),
    )
    .limit(1);
  if (!mine) throw new NotFoundError();
  return mine;
}

async function findRecipient(
  tx: Tx,
  targetId: string,
  proposerEntryId: string,
  userId: string,
) {
  const [row] = await tx
    .select({ name: entry.name, ownerUserId: entry.ownerUserId })
    .from(entry)
    .where(
      and(
        eq(entry.id, targetId),
        ne(entry.id, proposerEntryId),
        isNull(entry.erasureRequestedAt),
        publicEntryCondition(),
      ),
    )
    .limit(1);
  if (!row || row.ownerUserId === userId)
    throw new ProposeRefused("target_unavailable");
  return row;
}

async function insertLink(tx: Tx, input: ProposeLinkInput, userId: string) {
  const mine = await findProposerEntry(tx, input, userId);
  const outside = input.target.type === "outside";
  let targetId: string;
  let recipient: { name: string; ownerUserId: string | null } | null = null;
  if (input.target.type === "outside") {
    targetId = await findOrCreateOutsidePartner(
      tx,
      mine.id,
      input.target,
      mine.sourceLocale === "hr" ? "hr" : "en",
      userId,
    );
  } else {
    targetId = input.target.entryId;
    recipient = await findRecipient(tx, targetId, mine.id, userId);
  }

  const oriented = orientLink(input.kind, mine.id, targetId, input.direction);
  // A stale proposal for this exact link would block the new one until the daily job runs.
  await withdrawStaleProposals(
    tx,
    and(
      eq(link.fromId, oriented.fromId),
      eq(link.toId, oriented.toId),
      eq(link.kind, input.kind),
    ),
  );
  await assertLinkFree(tx, input.kind, oriented);
  // Counted in the transaction so a refused or failed attempt does not use up the day's proposals.
  await enforceLimits(
    [
      {
        key: `link-propose:${userId}`,
        max: LINK_LIMITS.proposalsPerOwnerPerDay,
        windowSeconds: DAY_SECONDS,
      },
    ],
    tx,
  );

  const [created] = await tx
    .insert(link)
    .values({
      ...oriented,
      kind: input.kind,
      // An outside partner has no account to decide, so the evidence URL stands in for the confirmation.
      status: outside ? "confirmed" : "proposed",
      year: input.year,
      endYear: input.endYear,
      project: input.project,
      note: input.note,
      proposedBy: userId,
      proposedByEntryId: mine.id,
      decidedBy: outside ? userId : null,
      decidedAt: outside ? new Date() : null,
    })
    .returning();
  if (input.evidenceUrl)
    await tx
      .insert(linkEvidence)
      .values({ linkId: created.id, url: input.evidenceUrl });
  await writeChange(tx, {
    entityType: "link",
    entityId: created.id,
    userId,
    source: "owner",
    action: "create",
    after: {
      kind: created.kind,
      status: created.status,
      fromId: created.fromId,
      toId: created.toId,
    },
  });
  // An unclaimed target has no account to mail; the proposal shows on the account page after a claim.
  if (recipient?.ownerUserId)
    await queueProposalEmail(tx, {
      linkId: created.id,
      ownerUserId: recipient.ownerUserId,
      proposerName: mine.name,
      entryName: recipient.name,
      input,
    });
  return created.id;
}

// Only link_live_unique means "exists"; a slug race on a new stub entry is a plain failure.
function isLinkTaken(error: unknown): boolean {
  const { cause } = error as { cause?: { code?: string; constraint?: string } };
  return [error as typeof cause, cause].some(
    (item) => item?.code === "23505" && item.constraint === "link_live_unique",
  );
}

export async function proposeLink(
  input: ProposeLinkInput,
  userId: string,
): Promise<ProposeLinkResult> {
  try {
    const linkId = await db.transaction((tx) => insertLink(tx, input, userId));
    await triggerDrain();
    return { ok: true, linkId };
  } catch (error) {
    if (error instanceof LimitError) return { ok: false, error: "limit" };
    if (error instanceof ProposeRefused)
      return { ok: false, error: error.code };
    // Two requests racing past assertLinkFree meet link_live_unique.
    if (isLinkTaken(error)) return { ok: false, error: "exists" };
    throw error;
  }
}
