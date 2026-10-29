import type { DbOrTx } from "@/db/client.server";
import type { JobResult } from "@/lib/jobs/job-registry.server";

import { buildGlossary } from "./glossary";
import { nextQuotaRetry } from "./quota-reset";
import {
  TranslationQuotaError,
  type ITranslationAdapter,
} from "./translation-adapter";
import { translateField } from "./translate-field.server";
import { REQUEST_TIMEOUT_MS } from "./workers-ai-adapter";
import {
  dropAllRows,
  dropMachineRows,
  dropMachineRowsOutsideLocale,
  rowsOf,
  saveMachineRow,
  type ITranslateRequest,
} from "./translation-rows.server";
import {
  loadFieldHash,
  loadTranslationSource,
  otherLocale,
} from "./translation-source.server";

export type { ITranslateRequest };

// Total model time of one job, well inside the 15 minute background function limit.
const JOB_BUDGET_MS = 4 * 60 * 1000;
const RESUME_DELAY_MS = 60 * 1000;

export interface IRunOptions {
  // Epoch ms; defaults to no drain limit.
  deadline?: number;
}

export async function runTranslation(
  db: DbOrTx,
  adapter: ITranslationAdapter,
  request: ITranslateRequest,
  now = new Date(),
  { deadline = Number.POSITIVE_INFINITY }: IRunOptions = {},
): Promise<JobResult> {
  // The budget runs on the wall clock from here; `now` only dates the quota reset.
  const startedAt = Date.now();
  const source = await loadTranslationSource(
    db,
    request.entityType,
    request.entityId,
  );
  if (!source) {
    await dropAllRows(db, request);
    return;
  }
  const to = otherLocale(source.sourceLocale);
  await dropMachineRowsOutsideLocale(db, request, to);
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

  const limit = Math.min(deadline, startedAt + JOB_BUDGET_MS);
  const context = {
    hasTime: () => Date.now() + REQUEST_TIMEOUT_MS < limit,
    adapter,
    from: source.sourceLocale,
    to,
    glossary: buildGlossary(source.name),
  };
  try {
    for (const field of pending) {
      const outcome = await translateField(field, context);
      if (outcome.status === "unavailable") return;
      if (outcome.status === "out_of_time")
        return { deferUntil: new Date(Date.now() + RESUME_DELAY_MS) };
      // A newer save may have changed this field while the model was working.
      const currentHash = await loadFieldHash(
        db,
        request.entityType,
        request.entityId,
        field.field,
      );
      if (currentHash !== field.hash) continue;
      // A failed field is kept as an empty row with this hash, so later jobs skip it until the
      // text changes. The page ignores empty rows.
      await saveMachineRow(db, request, to, {
        field: field.field,
        text: outcome.status === "ok" ? outcome.text : "",
        hash: field.hash,
        provider: outcome.status === "ok" ? adapter.name : "failed",
      });
    }
  } catch (error) {
    if (error instanceof TranslationQuotaError) {
      return { deferUntil: nextQuotaRetry(now) };
    }
    throw error;
  }
}
