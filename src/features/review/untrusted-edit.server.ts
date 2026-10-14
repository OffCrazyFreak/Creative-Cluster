import { dequal } from "dequal";
import { and, eq, inArray } from "drizzle-orm";

import { TAG_FIELDS } from "@/constants/tags";
import type { Tx } from "@/db/client.server";
import { entry, image, reviewItem } from "@/db/schema";
import { translatedTextChanged } from "@/features/account/save-own-listing.server";
import { saveEntryTags } from "@/features/tags/save-entry-tags.server";
import { writeChange } from "@/lib/change-log/write-change.server";
import { enqueueTranslation } from "@/lib/translation/enqueue-translation.server";
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

  // The queued patch is a full snapshot; only what still differs from the live row is a change, so edits made
  // since (an admin fix, a revert) are not overwritten with stale values.
  const proposed = await withoutMissingImages(
    tx,
    pickRevertible(recordOf(input.payload.patch)),
  );
  const changes = Object.fromEntries(
    Object.entries(proposed).filter(
      ([key, value]) => !dequal(row[key as keyof typeof row], value),
    ),
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
    await writeChange(tx, {
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
    // A patch without an extra field must not be read as one that empties it.
    if (translatedTextChanged(keys, row, { extra: row.extra, ...changes }))
      await enqueueTranslation(tx, { entityType: "entry", entityId: row.id });
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

// Tags have their own service and transaction, so they are applied first: if one fails the decision fails with
// the item still open, and approving again is safe because saving the same tags twice changes nothing.
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
    await saveEntryTags({
      entryId,
      field,
      tagIds: ids.filter((id): id is string => typeof id === "string"),
      actor: { userId: submittedBy, isAdmin: false },
    });
  }
}
