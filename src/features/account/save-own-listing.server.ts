import { dequal } from "dequal";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { TAG_FIELDS } from "@/constants/tags";
import { db, type Tx } from "@/db/client.server";
import { entry, entryTag, image, reviewItem } from "@/db/schema";
import { invalidateMapDirectory } from "@/features/directory/map-directory.server";
import { writeChange } from "@/lib/change-log/write-change.server";
import { enqueueJob } from "@/lib/jobs/enqueue-job.server";
import { triggerDrain } from "@/lib/jobs/trigger-drain.server";
import { NotFoundError } from "@/server/errors";

import type { ListingInput } from "./listing-schemas";
import { buildListingPatch, type ListingPatch } from "./listing-patch.server";
import { InvalidListingError } from "./listing-errors";
import type { SaveListingResult } from "./listing-types";

// The translation job reads the entry again, so the payload only names it.
const TRANSLATED_COLUMNS = [
  "name",
  "sourceLocale",
  "descriptionText",
  "offeringText",
  "seekingText",
] as const;

interface ISaveOwnListing {
  entryId: string;
  userId: string;
  values: ListingInput;
}

function ownedBy(entryId: string, userId: string) {
  // An erasure request freezes the listing; "missing", "not yours" and "being erased" look the same.
  return and(
    eq(entry.id, entryId),
    eq(entry.ownerUserId, userId),
    isNull(entry.erasureRequestedAt),
  );
}

function changedKeys(
  current: Record<string, unknown>,
  patch: ListingPatch,
): (keyof ListingPatch)[] {
  return (Object.keys(patch) as (keyof ListingPatch)[]).filter(
    (key) => !dequal(current[key], patch[key]),
  );
}

function pick(source: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(keys.map((key) => [key, source[key]]));
}

export function translatedTextChanged(
  keys: string[],
  current: Record<string, unknown>,
  patch: ListingPatch,
): boolean {
  if (TRANSLATED_COLUMNS.some((key) => keys.includes(key))) return true;
  const before = (current.extra as Record<string, unknown>).references_text;
  const after = (patch.extra as Record<string, unknown>).references_text;
  return (before ?? "") !== (after ?? "");
}

async function assertImagesExist(tx: Tx, values: ListingInput) {
  const ids = [values.logo?.id, values.cover?.id].filter((id): id is string =>
    Boolean(id),
  );
  if (ids.length === 0) return;
  const found = await tx
    .select({ id: image.id })
    .from(image)
    .where(inArray(image.id, ids));
  if (found.length !== new Set(ids).size) throw new InvalidListingError();
}

async function tagsDiffer(tx: Tx, entryId: string, values: ListingInput) {
  const rows = await tx
    .select({ tagId: entryTag.tagId, field: entryTag.field })
    .from(entryTag)
    .where(eq(entryTag.entryId, entryId));
  return TAG_FIELDS.some((field) => {
    const stored = rows.filter((row) => row.field === field);
    const wanted = new Set(values.tags[field]);
    return (
      stored.length !== wanted.size || stored.some((r) => !wanted.has(r.tagId))
    );
  });
}

async function dismissOpenEdits(tx: Tx, entryId: string) {
  await tx
    .update(reviewItem)
    .set({ status: "dismissed", decidedAt: sql`now()` })
    .where(
      and(
        eq(reviewItem.type, "untrusted_edit"),
        eq(reviewItem.entityType, "entry"),
        eq(reviewItem.entityId, entryId),
        eq(reviewItem.status, "open"),
      ),
    );
}

// An untrusted entry keeps its live content; the edit waits as one open review item per entry.
async function queueForReview(
  tx: Tx,
  entryId: string,
  userId: string,
  patch: ListingPatch,
  values: ListingInput,
) {
  await dismissOpenEdits(tx, entryId);
  await tx.insert(reviewItem).values({
    type: "untrusted_edit",
    entityType: "entry",
    entityId: entryId,
    payload: { patch, tags: values.tags, submittedBy: userId },
  });
}

export async function saveOwnListing({
  entryId,
  userId,
  values,
}: ISaveOwnListing): Promise<SaveListingResult> {
  let queuedJob = false;
  const result = await db.transaction(
    async (tx): Promise<SaveListingResult> => {
      const [current] = await tx
        .select()
        .from(entry)
        .where(ownedBy(entryId, userId))
        .for("update");
      if (!current) throw new NotFoundError();

      const patch = buildListingPatch(current, values);
      const keys = changedKeys(current, patch);
      await assertImagesExist(tx, values);
      if (!current.trusted) {
        // Tags are saved by their own service, so an untrusted entry's tag edits ride in the review item.
        if (keys.length === 0 && !(await tagsDiffer(tx, entryId, values))) {
          await dismissOpenEdits(tx, entryId);
          return { status: "saved", changed: false };
        }
        await queueForReview(tx, entryId, userId, patch, values);
        return { status: "pending_review" };
      }
      if (keys.length === 0) return { status: "saved", changed: false };

      const moved = keys.some((key) => ["lat", "lng"].includes(key));
      const [updated] = await tx
        .update(entry)
        .set({ ...patch, ...(moved ? { geocodedAt: new Date() } : {}) })
        .where(ownedBy(entryId, userId))
        .returning({ id: entry.id });
      if (!updated) throw new NotFoundError();

      const log = await writeChange(tx, {
        entityType: "entry",
        entityId: entryId,
        userId,
        source: "owner",
        action: "update",
        before: pick(current, keys),
        after: pick(patch, keys),
      });
      if (translatedTextChanged(keys, current, patch)) {
        queuedJob = true;
        await enqueueJob(tx, {
          type: "translate",
          payload: { entityType: "entry", entityId: entryId },
          idempotencyKey: `translate:entry:${entryId}:${log.id}`,
        });
      }
      return { status: "saved", changed: true };
    },
  );

  if (result.status === "saved" && result.changed) {
    invalidateMapDirectory();
    if (queuedJob) await triggerDrain();
  }
  return result;
}
