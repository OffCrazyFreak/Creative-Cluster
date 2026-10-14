import { and, eq, inArray, isNull, ne, or, sql, type SQL } from "drizzle-orm";

import type { ChangeSource } from "@/constants/moderation";
import { db } from "@/db/client.server";
import { entry, link } from "@/db/schema";
import { writeChange } from "@/lib/change-log/write-change.server";
import { NotFoundError } from "@/server/errors";

import type { DecideLinkInput } from "./connections-schemas";
import { isLiveLink, recipientEntryId } from "./link-conditions.server";

type Actor = { userId: string; admin: boolean };

// Ownership sits in the same statement as the update. An admin acts only for a recipient
// listing without an owner; a listing with an owner decides for itself.
function recipientOwnedBy({ userId, admin }: Actor): SQL {
  const owned = admin
    ? or(eq(entry.ownerUserId, userId), sql`${entry.ownerUserId} is null`)
    : eq(entry.ownerUserId, userId);
  return sql`exists (select 1 from ${entry} where ${entry.id} = ${recipientEntryId} and ${owned})`;
}

export async function decideLink(
  { linkId, decision }: DecideLinkInput,
  actor: Actor,
): Promise<void> {
  const status = decision === "confirm" ? "confirmed" : "rejected";
  const source: ChangeSource = actor.admin ? "admin" : "owner";
  await db.transaction(async (tx) => {
    const [row] = await tx
      .update(link)
      .set({ status, decidedBy: actor.userId, decidedAt: new Date() })
      .where(
        and(
          eq(link.id, linkId),
          eq(link.status, "proposed"),
          // Nobody confirms their own proposal, an admin included.
          or(isNull(link.proposedBy), ne(link.proposedBy, actor.userId)),
          isLiveLink(),
          recipientOwnedBy(actor),
        ),
      )
      .returning({ id: link.id });
    if (!row) throw new NotFoundError();
    await writeChange(tx, {
      entityType: "link",
      entityId: linkId,
      userId: actor.userId,
      source,
      action: "status_change",
      before: { status: "proposed", decidedBy: null },
      after: { status, decidedBy: actor.userId },
    });
  });
}

// Either side may withdraw a proposal or end a confirmed link.
export async function withdrawLink(
  linkId: string,
  userId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const touchesMine = and(
      eq(link.id, linkId),
      inArray(link.status, ["proposed", "confirmed"]),
      sql`exists (select 1 from ${entry} where ${entry.ownerUserId} = ${userId} and ${entry.id} in (${link.fromId}, ${link.toId}))`,
    );
    const [before] = await tx
      .select({ status: link.status })
      .from(link)
      .where(touchesMine)
      .for("update");
    if (!before) throw new NotFoundError();
    await tx
      .update(link)
      .set({ status: "withdrawn", decidedAt: new Date() })
      .where(touchesMine);
    await writeChange(tx, {
      entityType: "link",
      entityId: linkId,
      userId,
      source: "owner",
      action: "status_change",
      before: { status: before.status },
      after: { status: "withdrawn" },
    });
  });
}
