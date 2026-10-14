import { and, eq } from "drizzle-orm";

import { db } from "@/db/client.server";
import { entry } from "@/db/schema";
import { writeChange } from "@/lib/change-log/write-change.server";
import { enqueueTranslation } from "@/lib/translation/enqueue-translation.server";
import { rowsOf } from "@/lib/translation/translation-rows.server";
import {
  loadTranslationSource,
  otherLocale,
} from "@/lib/translation/translation-source.server";
import { NotFoundError } from "@/server/errors";

import {
  applyOwnerEdit,
  valueFor,
  type SaveInput,
} from "./translation-edit-rows.server";
import { TRANSLATED_FIELDS } from "./translation-fields";

// `enqueued` tells the caller whether a machine translation job needs a drain.
export async function saveOwnerTranslation(
  userId: string,
  input: SaveInput,
): Promise<{ enqueued: boolean }> {
  return db.transaction(async (tx) => {
    const [owned] = await tx
      .select({ id: entry.id })
      .from(entry)
      .where(and(eq(entry.id, input.entryId), eq(entry.ownerUserId, userId)))
      .for("update")
      .limit(1);
    if (!owned) throw new NotFoundError();
    const source = await loadTranslationSource(tx, "entry", owned.id);
    if (!source) throw new NotFoundError();
    const to = otherLocale(source.sourceLocale);
    const existing = new Map(
      (await rowsOf(tx, { entityType: "entry", entityId: owned.id }, to)).map(
        (row) => [row.field, row],
      ),
    );
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    let removed = false;

    for (const field of TRANSLATED_FIELDS) {
      const value = valueFor(input, field);
      const sourceField = source.fields.find((f) => f.field === field);
      if (value === undefined || !sourceField) continue;
      const previous = existing.get(field);
      const outcome = await applyOwnerEdit(
        tx,
        owned.id,
        to,
        field,
        value,
        sourceField.hash,
        previous,
      );
      if (outcome === "unchanged") continue;
      before[`translation_${field}`] = previous?.text ?? null;
      after[`translation_${field}`] = outcome === "removed" ? null : value;
      removed ||= outcome === "removed";
    }

    if (Object.keys(after).length === 0) return { enqueued: false };
    await writeChange(tx, {
      entityType: "entry",
      entityId: owned.id,
      userId,
      source: "owner",
      action: "update",
      before,
      after,
    });
    // A removed human version is replaced by a fresh machine one.
    if (removed)
      await enqueueTranslation(tx, { entityType: "entry", entityId: owned.id });
    return { enqueued: removed };
  });
}
