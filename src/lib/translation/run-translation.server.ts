import { and, eq, inArray } from "drizzle-orm";

import type { AppLocale } from "@/constants/locales";
import type { TranslatableEntity } from "@/constants/translations";
import type { DbOrTx } from "@/db/client.server";
import { translation } from "@/db/schema";
import type { JobResult } from "@/lib/jobs/job-registry.server";
import { RichTextError } from "@/lib/rich-text/rich-text-error";
import { rebuildRichText } from "@/lib/rich-text/translation-blocks";

import { buildGlossary } from "./glossary";
import { nextQuotaReset } from "./quota-reset";
import {
  TranslationOutputError,
  TranslationQuotaError,
  type ITranslationAdapter,
} from "./translation-adapter";
import {
  loadTranslationSource,
  otherLocale,
  type ISourceField,
} from "./translation-source.server";
import { validateTranslation } from "./validate-translation";

export interface ITranslateRequest {
  entityType: TranslatableEntity;
  entityId: string;
}

interface IStorable {
  field: ISourceField;
  text: string;
}

// Validated text for one field, or null when the model's answer must not be stored.
function acceptField(
  field: ISourceField,
  translated: string[],
  to: AppLocale,
): string | null {
  if (validateTranslation(field.blocks, translated, to)) return null;
  if (!field.skeleton) return translated[0];
  try {
    return JSON.stringify(rebuildRichText(field.skeleton, translated).doc);
  } catch (error) {
    if (error instanceof RichTextError) return null;
    throw error;
  }
}

async function translateFields(
  adapter: ITranslationAdapter,
  fields: ISourceField[],
  from: AppLocale,
  to: AppLocale,
  glossary: string[],
) {
  const stored: IStorable[] = [];
  const failed: ISourceField[] = [];
  const blocks = fields.flatMap((f) => f.blocks);
  let out: string[] | null;
  try {
    out = await adapter.translate({ blocks, from, to, glossary });
  } catch (error) {
    if (!(error instanceof TranslationOutputError)) throw error;
    return { stored, failed: fields, unavailable: false };
  }
  if (!out) return { stored, failed, unavailable: true };
  if (out.length !== blocks.length) {
    return { stored, failed: fields, unavailable: false };
  }
  let offset = 0;
  for (const field of fields) {
    const text = acceptField(
      field,
      out.slice(offset, offset + field.blocks.length),
      to,
    );
    offset += field.blocks.length;
    if (text === null) failed.push(field);
    else stored.push({ field, text });
  }
  return { stored, failed, unavailable: false };
}

// The where clause keeps a human edit that lands between the read and this write.
async function saveMachineRows(
  tx: DbOrTx,
  request: ITranslateRequest,
  to: AppLocale,
  provider: string,
  rows: IStorable[],
) {
  for (const { field, text } of rows) {
    await tx
      .insert(translation)
      .values({
        entityType: request.entityType,
        entityId: request.entityId,
        field: field.field,
        locale: to,
        text,
        origin: "machine",
        provider,
        sourceHash: field.hash,
      })
      .onConflictDoUpdate({
        target: [
          translation.entityType,
          translation.entityId,
          translation.field,
          translation.locale,
        ],
        set: { text, provider, sourceHash: field.hash, updatedAt: new Date() },
        setWhere: eq(translation.origin, "machine"),
      });
  }
}

// A machine row for text that changed, emptied or failed to retranslate would show stale text.
async function dropMachineRows(
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

export async function runTranslation(
  db: DbOrTx,
  adapter: ITranslationAdapter,
  request: ITranslateRequest,
  now = new Date(),
): Promise<JobResult> {
  const source = await loadTranslationSource(
    db,
    request.entityType,
    request.entityId,
  );
  if (!source) return;
  const to = otherLocale(source.sourceLocale);

  const existing = await db
    .select()
    .from(translation)
    .where(
      and(
        eq(translation.entityType, request.entityType),
        eq(translation.entityId, request.entityId),
        eq(translation.locale, to),
      ),
    );
  const rowOf = new Map(existing.map((row) => [row.field, row]));

  const present = new Set(source.fields.map((f) => f.field));
  await dropMachineRows(
    db,
    request,
    to,
    source.allFields.filter((name) => !present.has(name)),
  );

  const pending = source.fields.filter((field) => {
    const row = rowOf.get(field.field);
    if (row?.origin === "human") return false;
    return row?.sourceHash !== field.hash;
  });
  if (pending.length === 0) return;

  const glossary = buildGlossary(source.name);
  try {
    let first = await translateFields(
      adapter,
      pending,
      source.sourceLocale,
      to,
      glossary,
    );
    if (first.unavailable) return;
    let stored = first.stored;
    if (first.failed.length > 0) {
      const second = await translateFields(
        adapter,
        first.failed,
        source.sourceLocale,
        to,
        glossary,
      );
      stored = [...stored, ...second.stored];
      first = { ...first, failed: second.failed };
    }
    await saveMachineRows(db, request, to, adapter.name, stored);
    await dropMachineRows(
      db,
      request,
      to,
      first.failed.map((f) => f.field),
    );
  } catch (error) {
    if (error instanceof TranslationQuotaError) {
      return { deferUntil: nextQuotaReset(now) };
    }
    throw error;
  }
}
