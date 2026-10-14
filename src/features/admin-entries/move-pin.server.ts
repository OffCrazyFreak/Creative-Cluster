import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db/client.server";
import { entry, reviewItem } from "@/db/schema";
import { invalidateMapDirectory } from "@/features/directory/map-directory.server";
import { writeChange } from "@/lib/change-log/write-change.server";

import type { MovePinError, OpResult } from "./admin-entries-schemas";

// People are stored at town level only (privacy offset), so a hand-placed exact pin is refused for them.
export async function movePin(
  entryId: string,
  point: { lat: number; lng: number },
  adminId: string,
): Promise<OpResult<MovePinError>> {
  const result = await db.transaction(
    async (tx): Promise<OpResult<MovePinError>> => {
      const [row] = await tx
        .select()
        .from(entry)
        .where(eq(entry.id, entryId))
        .limit(1)
        .for("update");
      if (!row) return { ok: false, error: "not_found" };
      if (row.kind === "person") return { ok: false, error: "person" };
      const patch = {
        ...point,
        onlineOnly: false,
        pinMovedByHand: true,
        locationSource: "manual" as const,
        precision: "house" as const,
        geocodedAt: new Date(),
      };
      await tx.update(entry).set(patch).where(eq(entry.id, entryId));
      // A queued owner edit holds a full snapshot; approving it later would write the old coordinates back over this move.
      await tx
        .update(reviewItem)
        .set({
          payload: sql`jsonb_set(${reviewItem.payload}, '{patch}', (${reviewItem.payload}->'patch') || ${JSON.stringify(
            {
              lat: point.lat,
              lng: point.lng,
              onlineOnly: false,
              pinMovedByHand: true,
              locationSource: "manual",
              precision: "house",
            },
          )}::jsonb)`,
        })
        .where(
          and(
            eq(reviewItem.type, "untrusted_edit"),
            eq(reviewItem.status, "open"),
            eq(reviewItem.entityId, entryId),
            sql`${reviewItem.payload}->'patch' ? 'lat'`,
          ),
        );
      await writeChange(tx, {
        entityType: "entry",
        entityId: entryId,
        userId: adminId,
        source: "admin",
        action: "update",
        before: {
          lat: row.lat,
          lng: row.lng,
          onlineOnly: row.onlineOnly,
          pinMovedByHand: row.pinMovedByHand,
          locationSource: row.locationSource,
          precision: row.precision,
        },
        after: {
          lat: point.lat,
          lng: point.lng,
          onlineOnly: false,
          pinMovedByHand: true,
          locationSource: "manual",
          precision: "house",
        },
      });
      return { ok: true };
    },
  );
  if (result.ok) invalidateMapDirectory();
  return result;
}
