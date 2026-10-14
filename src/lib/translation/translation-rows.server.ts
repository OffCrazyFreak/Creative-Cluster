import { and, eq, inArray } from "drizzle-orm";

import type { AppLocale } from "@/constants/locales";
import type { TranslatableEntity } from "@/constants/translations";
import type { DbOrTx } from "@/db/client.server";
import { translation } from "@/db/schema";

export interface ITranslateRequest {
  entityType: TranslatableEntity;
  entityId: string;
}

export function rowsOf(db: DbOrTx, request: ITranslateRequest, to: AppLocale) {
  return db
    .select()
    .from(translation)
    .where(
      and(
        eq(translation.entityType, request.entityType),
        eq(translation.entityId, request.entityId),
        eq(translation.locale, to),
      ),
    );
}

// The where clause keeps a human edit that lands between the read and this write.
export async function saveMachineRow(
  tx: DbOrTx,
  request: ITranslateRequest,
  to: AppLocale,
  row: { field: string; text: string; hash: string; provider: string },
) {
  await tx
    .insert(translation)
    .values({
      entityType: request.entityType,
      entityId: request.entityId,
      field: row.field,
      locale: to,
      text: row.text,
      origin: "machine",
      provider: row.provider,
      sourceHash: row.hash,
    })
    .onConflictDoUpdate({
      target: [
        translation.entityType,
        translation.entityId,
        translation.field,
        translation.locale,
      ],
      set: {
        text: row.text,
        provider: row.provider,
        sourceHash: row.hash,
        updatedAt: new Date(),
      },
      setWhere: eq(translation.origin, "machine"),
    });
}

// A machine row for text that changed or was emptied would keep showing the old translation.
export async function dropMachineRows(
  tx: DbOrTx,
  request: ITranslateRequest,
  to: AppLocale,
  fields: string[],
) {
  if (fields.length === 0) return;
  await tx
    .delete(translation)
    .where(
      and(
        eq(translation.entityType, request.entityType),
        eq(translation.entityId, request.entityId),
        eq(translation.locale, to),
        eq(translation.origin, "machine"),
        inArray(translation.field, fields),
      ),
    );
}
