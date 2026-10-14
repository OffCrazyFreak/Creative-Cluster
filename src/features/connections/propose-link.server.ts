import { and, eq, gt, inArray, ne, or } from "drizzle-orm";

import { LINK_LIMITS } from "@/constants/links";
import { db, type Tx } from "@/db/client.server";
import { entry, link, linkEvidence, user } from "@/db/schema";
import { allocateSlug } from "@/features/entry/slug.server";
import { publicEntryCondition } from "@/features/entry/public-entry-filter.server";
import { writeChange } from "@/lib/change-log/write-change.server";
import { enqueueEmail } from "@/lib/email/enqueue-email.server";
import { pageLink } from "@/lib/auth/auth-email.server";
import { triggerDrain } from "@/lib/jobs/trigger-drain.server";
import { enforceLimits } from "@/lib/limits/check-limit.server";
import { LimitError, NotFoundError } from "@/server/errors";

import type {
  ProposeError,
  ProposeLinkInput,
  ProposeLinkResult,
} from "./connections-schemas";
import { withdrawStaleProposals } from "./expire-links.server";
import { daysAgo } from "./link-conditions.server";
import { orientLink } from "./orient-link";

class ProposeRefused extends Error {
  constructor(readonly code: ProposeError) {
    super(code);
  }
}

async function createOutsidePartner(
  tx: Tx,
  input: Extract<ProposeLinkInput["target"], { type: "outside" }>,
  sourceLocale: "en" | "hr",
  userId: string,
) {
  const [row] = await tx
    .insert(entry)
    .values({
      slug: await allocateSlug(tx, input.name),
      kind: "outside_partner",
      status: "draft",
      name: input.name,
      website: input.website,
      sourceLocale,
    })
    .returning({ id: entry.id });
  await writeChange(tx, {
    entityType: "entry",
    entityId: row.id,
    userId,
    source: "owner",
    action: "create",
    after: { kind: "outside_partner", name: input.name },
  });
  return row.id;
}

async function assertFree(tx: Tx, input: ProposeLinkInput, targetId: string) {
  const pair = or(
    and(eq(link.fromId, input.fromEntryId), eq(link.toId, targetId)),
    and(eq(link.fromId, targetId), eq(link.toId, input.fromEntryId)),
  );
  const rows = await tx
    .select({ status: link.status, decidedAt: link.decidedAt })
    .from(link)
    .where(
      and(
        pair,
        eq(link.kind, input.kind),
        or(
          inArray(link.status, ["proposed", "confirmed"]),
          and(
            eq(link.status, "rejected"),
            gt(link.decidedAt, daysAgo(LINK_LIMITS.rejectCooldownDays)),
          ),
        ),
      ),
    );
  if (rows.some((row) => row.status !== "rejected"))
    throw new ProposeRefused("exists");
  if (rows.length > 0) throw new ProposeRefused("cooldown");
}

async function insertLink(tx: Tx, input: ProposeLinkInput, userId: string) {
  await withdrawStaleProposals(tx);
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
        publicEntryCondition(),
      ),
    )
    .limit(1);
  if (!mine) throw new NotFoundError();

  const outside = input.target.type === "outside";
  let targetId: string;
  let recipient: { name: string; ownerUserId: string | null } | null = null;
  if (input.target.type === "outside") {
    const locale = mine.sourceLocale === "hr" ? "hr" : "en";
    targetId = await createOutsidePartner(tx, input.target, locale, userId);
  } else {
    targetId = input.target.entryId;
    const [row] = await tx
      .select({ name: entry.name, ownerUserId: entry.ownerUserId })
      .from(entry)
      .where(
        and(
          eq(entry.id, targetId),
          ne(entry.id, mine.id),
          publicEntryCondition(),
        ),
      )
      .limit(1);
    if (!row || row.ownerUserId === userId)
      throw new ProposeRefused("target_unavailable");
    recipient = row;
  }

  await assertFree(tx, input, targetId);
  const oriented = orientLink(input.kind, mine.id, targetId, input.direction);
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

interface IProposalMail {
  linkId: string;
  ownerUserId: string;
  proposerName: string;
  entryName: string;
  input: ProposeLinkInput;
}

async function queueProposalEmail(tx: Tx, mail: IProposalMail) {
  const [owner] = await tx
    .select({ email: user.email, locale: user.locale, banned: user.banned })
    .from(user)
    .where(eq(user.id, mail.ownerUserId))
    .limit(1);
  if (!owner || owner.banned) return;
  const locale = owner.locale === "hr" ? "hr" : "en";
  await enqueueEmail(tx, {
    template: "connection",
    to: owner.email,
    props: {
      locale,
      proposerName: mail.proposerName,
      entryName: mail.entryName,
      kind: mail.input.kind,
      year: mail.input.year,
      note: mail.input.note,
      link: pageLink("/account/connections", locale),
    },
    idempotencyKey: `connection:${mail.linkId}`,
  });
}

export async function proposeLink(
  input: ProposeLinkInput,
  userId: string,
): Promise<ProposeLinkResult> {
  try {
    await enforceLimits([
      {
        key: `link-propose:${userId}`,
        max: LINK_LIMITS.proposalsPerOwnerPerDay,
        windowSeconds: 24 * 60 * 60,
      },
    ]);
    const linkId = await db.transaction((tx) => insertLink(tx, input, userId));
    await triggerDrain();
    return { ok: true, linkId };
  } catch (error) {
    if (error instanceof LimitError) return { ok: false, error: "limit" };
    if (error instanceof ProposeRefused)
      return { ok: false, error: error.code };
    // Two requests racing past assertFree meet link_live_unique.
    if (isUniqueViolation(error)) return { ok: false, error: "exists" };
    throw error;
  }
}

function isUniqueViolation(error: unknown): boolean {
  const cause = (error as { cause?: { code?: string } } | null)?.cause;
  return (
    (error as { code?: string } | null)?.code === "23505" ||
    cause?.code === "23505"
  );
}
