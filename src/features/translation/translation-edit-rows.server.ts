import { and, eq } from "drizzle-orm";
import type { z } from "zod";

import type { AppLocale } from "@/constants/locales";
import type { DbOrTx } from "@/db/client.server";
import { translation } from "@/db/schema";

import type { TranslatedField } from "./translation-fields";
import type { saveTranslationInputSchema } from "./translation-schemas";

export type SaveInput = z.output<typeof saveTranslationInputSchema>;
export type EditOutcome = "saved" | "removed" | "unchanged";

// Text to store for a field, "" to remove the owner's version, undefined to leave it alone.
export function valueFor(input: SaveInput, field: TranslatedField) {
  if (field === "description") {
    if (input.description === undefined) return undefined;
    const parsed = input.description;
    return parsed && parsed.text.trim() ? JSON.stringify(parsed.doc) : "";
  }
  return input[field]?.trim();
}

interface IExisting {
  text: string;
  origin: "machine" | "human";
}

// The owner's version is a human row: the machine job never touches it again.
export async function applyOwnerEdit(
  tx: DbOrTx,
  entryId: string,
  to: AppLocale,
  field: TranslatedField,
  value: string,
  sourceHash: string,
  existing: IExisting | undefined,
): Promise<EditOutcome> {
  const match = and(
    eq(translation.entityType, "entry"),
    eq(translation.entityId, entryId),
    eq(translation.field, field),
    eq(translation.locale, to),
  );
  if (value === "") {
    if (existing?.origin !== "human") return "unchanged";
    await tx
      .delete(translation)
      .where(and(match, eq(translation.origin, "human")));
    return "removed";
  }
  if (existing?.text === value) return "unchanged";
  await tx
    .insert(translation)
    .values({
      entityType: "entry",
      entityId: entryId,
      field,
      locale: to,
      text: value,
      origin: "human",
      sourceHash,
    })
    .onConflictDoUpdate({
      target: [
        translation.entityType,
        translation.entityId,
        translation.field,
        translation.locale,
      ],
      set: {
        text: value,
        origin: "human",
        provider: null,
        sourceHash,
        updatedAt: new Date(),
      },
    });
  return "saved";
}
