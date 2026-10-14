import type { DbOrTx } from "@/db/client.server";
import type { JobResult } from "@/lib/jobs/job-registry.server";

import { buildGlossary } from "./glossary";
import { nextQuotaReset } from "./quota-reset";
import {
  TranslationQuotaError,
  type ITranslationAdapter,
} from "./translation-adapter";
import { translateField } from "./translate-field.server";
import {
  dropMachineRows,
  rowsOf,
  saveMachineRow,
  type ITranslateRequest,
} from "./translation-rows.server";
import {
  loadTranslationSource,
  otherLocale,
} from "./translation-source.server";

export type { ITranslateRequest };

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
  const existing = new Map(
    (await rowsOf(db, request, to)).map((row) => [row.field, row]),
  );

  const present = new Set(source.fields.map((f) => f.field));
  const pending = source.fields.filter((field) => {
    const row = existing.get(field.field);
    return row?.origin !== "human" && row?.sourceHash !== field.hash;
  });
  // Emptied or changed text must not keep showing its old translation, whatever happens next.
  await dropMachineRows(db, request, to, [
    ...source.allFields.filter((name) => !present.has(name)),
    ...pending.map((f) => f.field),
  ]);

  const context = {
    adapter,
    from: source.sourceLocale,
    to,
    glossary: buildGlossary(source.name),
  };
  try {
    for (const field of pending) {
      const outcome = await translateField(field, context);
      if (outcome.status === "unavailable") return;
      if (outcome.status === "invalid") continue;
      // A newer save may have changed this field while the model was working.
      const current = await loadTranslationSource(
        db,
        request.entityType,
        request.entityId,
      );
      if (
        current?.fields.find((f) => f.field === field.field)?.hash !==
        field.hash
      )
        continue;
      await saveMachineRow(db, request, to, {
        field: field.field,
        text: outcome.text,
        hash: field.hash,
        provider: adapter.name,
      });
    }
  } catch (error) {
    if (error instanceof TranslationQuotaError) {
      return { deferUntil: nextQuotaReset(now) };
    }
    throw error;
  }
}
