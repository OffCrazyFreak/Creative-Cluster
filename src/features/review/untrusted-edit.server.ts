import { and, eq, inArray } from "drizzle-orm";

import { TAG_FIELDS } from "@/constants/tags";
import type { Tx } from "@/db/client.server";
import { entry, image, reviewItem } from "@/db/schema";
import { translatedTextChanged } from "@/features/account/save-own-listing.server";
import { saveEntryTags } from "@/features/tags/save-entry-tags.server";
import { writeChange } from "@/lib/change-log/write-change.server";
import { enqueueJob } from "@/lib/jobs/enqueue-job.server";
import { NotFoundError } from "@/server/errors";

import { pickRevertible } from "./entry-fields";

interface IApplyUntrustedEdit {
  itemId: string;
  entryId: string;
  adminId: string;
  // Written by the owner edit service: { patch, tags, submittedBy }.
  payload: Record<string, unknown>;
}

function recordOf(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

// An image deleted since the edit was queued must not leave a dangling reference.
async function withoutMissingImages(
  tx: Tx,
  changes: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const ids = ["logoImageId", "coverImageId"]
    .map((key) => changes[key])
    .filter((id): id is string => typeof id === "string");
  if (ids.length === 0) return changes;
  const found = new Set(
    (
      await tx
        .select({ id: image.id })
        .from(image)
        .where(inArray(image.id, ids))
    ).map((row) => row.id),
  );
  return Object.fromEntries(
    Object.entries(changes).filter(
      ([key, value]) =>
        !["logoImageId", "coverImageId"].includes(key) ||
        value === null ||
        found.has(value as string),
    ),
  );
}

export async function applyUntrustedEdit(tx: Tx, input: IApplyUntrustedEdit) {
  const [row] = await tx
    .select()
    .from(entry)
    .where(and(eq(entry.id, input.entryId), eq(entry.status, "published")))
    .limit(1)
    .for("update");
  if (!row) throw new NotFoundError();

  const changes = await withoutMissingImages(
    tx,
    pickRevertible(recordOf(input.payload.patch)),
  );
  const keys = Object.keys(changes);
  if (keys.length > 0) {
    await tx
      .update(entry)
      .set({
        ...changes,
        ...("lat" in changes || "lng" in changes
          ? { geocodedAt: new Date() }
          : {}),
      })
      .where(eq(entry.id, row.id));
    const submittedBy = input.payload.submittedBy;
    const log = await writeChange(tx, {
      entityType: "entry",
      entityId: row.id,
      userId: typeof submittedBy === "string" ? submittedBy : null,
      source: "owner",
      action: "update",
      before: Object.fromEntries(
        keys.map((key) => [key, row[key as keyof typeof row]]),
      ),
      after: changes,
    });
    if (translatedTextChanged(keys, row, changes)) {
      await enqueueJob(tx, {
        type: "translate",
        payload: { entityType: "entry", entityId: row.id },
        idempotencyKey: `translate:entry:${row.id}:${log.id}`,
      });
    }
  }
  await tx
    .update(reviewItem)
    .set({
      status: "approved",
      decidedBy: input.adminId,
      decidedAt: new Date(),
    })
    .where(eq(reviewItem.id, input.itemId));
}

// Tags have their own service and transaction, so they are applied after the entry fields commit.
// A tag removed since the edit was queued only skips that field.
export async function applyUntrustedEditTags(
  entryId: string,
  payload: Record<string, unknown>,
) {
  const tags = recordOf(payload.tags);
  const submittedBy = payload.submittedBy;
  if (typeof submittedBy !== "string") return;
  for (const field of TAG_FIELDS) {
    const ids = tags[field];
    if (!Array.isArray(ids)) continue;
    try {
      await saveEntryTags({
        entryId,
        field,
        tagIds: ids.filter((id): id is string => typeof id === "string"),
        actor: { userId: submittedBy, isAdmin: false },
      });
    } catch (error) {
      console.error("approved edit: tags not applied", entryId, field, error);
    }
  }
}
