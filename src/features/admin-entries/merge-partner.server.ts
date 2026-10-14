import { and, eq, inArray, ne, or } from "drizzle-orm";

import { db, type Tx } from "@/db/client.server";
import { entry, link, reviewItem } from "@/db/schema";
import { invalidateMapDirectory } from "@/features/directory/map-directory.server";
import { writeChange } from "@/lib/change-log/write-change.server";

import type { MergeError, OpResult } from "./admin-entries-schemas";

type LinkRow = typeof link.$inferSelect;

const LIVE = ["proposed", "confirmed"] as const;

// Returns true when the link moved, false when it had to be dropped (it would link the target to itself, or
// duplicate a live link the target already has).
async function repoint(tx: Tx, row: LinkRow, stubId: string, targetId: string) {
  function swap(id: string) {
    return id === stubId ? targetId : id;
  }
  let fromId = swap(row.fromId);
  let toId = swap(row.toId);
  if (fromId === toId) return false;
  // Symmetric links keep the smaller id first (table CHECK).
  if (row.symmetric && fromId > toId) [fromId, toId] = [toId, fromId];
  if (LIVE.some((status) => status === row.status)) {
    const [dup] = await tx
      .select({ id: link.id, status: link.status })
      .from(link)
      .where(
        and(
          eq(link.fromId, fromId),
          eq(link.toId, toId),
          eq(link.kind, row.kind),
          inArray(link.status, [...LIVE]),
          ne(link.id, row.id),
        ),
      )
      .limit(1);
    if (dup) {
      // Keep the stronger of the two: a confirmed stub link replaces a merely proposed one on the target.
      if (!(row.status === "confirmed" && dup.status === "proposed"))
        return false;
      await tx.delete(link).where(eq(link.id, dup.id));
    }
  }
  await tx
    .update(link)
    .set({
      fromId,
      toId,
      proposedByEntryId:
        row.proposedByEntryId === null ? null : swap(row.proposedByEntryId),
    })
    .where(eq(link.id, row.id));
  return true;
}

// Replaces an outside partner stub by a real listing in one transaction: links move, the stub is deleted.
export async function mergePartner(
  stubId: string,
  targetId: string,
  adminId: string,
): Promise<OpResult<MergeError>> {
  if (stubId === targetId) return { ok: false, error: "bad_target" };
  const result = await db.transaction(
    async (tx): Promise<OpResult<MergeError>> => {
      // Both rows are locked in id order so two merges cannot deadlock.
      const rows = await tx
        .select()
        .from(entry)
        .where(inArray(entry.id, [stubId, targetId]))
        .orderBy(entry.id)
        .for("update");
      const stub = rows.find((row) => row.id === stubId);
      const target = rows.find((row) => row.id === targetId);
      if (!stub || !target) return { ok: false, error: "not_found" };
      if (stub.kind !== "outside_partner")
        return { ok: false, error: "not_a_stub" };
      if (target.kind === "outside_partner" || target.erasureRequestedAt)
        return { ok: false, error: "bad_target" };

      const links = await tx
        .select()
        .from(link)
        .where(
          or(
            eq(link.fromId, stubId),
            eq(link.toId, stubId),
            eq(link.proposedByEntryId, stubId),
          ),
        );
      let moved = 0;
      for (const row of links) {
        if (await repoint(tx, row, stubId, targetId)) moved += 1;
      }
      await tx
        .update(reviewItem)
        .set({ entityId: targetId })
        .where(
          and(
            eq(reviewItem.entityType, "entry"),
            eq(reviewItem.entityId, stubId),
          ),
        );
      // Links that could not move cascade away with the stub.
      await tx.delete(entry).where(eq(entry.id, stubId));
      await writeChange(tx, {
        entityType: "entry",
        entityId: stubId,
        userId: adminId,
        source: "admin",
        action: "delete",
        before: { kind: stub.kind, name: stub.name },
        after: { mergedInto: targetId },
      });
      await writeChange(tx, {
        entityType: "entry",
        entityId: targetId,
        userId: adminId,
        source: "admin",
        action: "update",
        before: { mergedPartner: null },
        after: {
          mergedPartner: stub.name,
          linksMoved: moved,
          linksDropped: links.length - moved,
        },
      });
      return { ok: true };
    },
  );
  if (result.ok) invalidateMapDirectory();
  return result;
}
