import type { ZodError } from "zod";

import { site } from "@/sites";

import type { IImportPlan, ImportFileError } from "./import-plan-codes";
import { planImport } from "./import-plan.server";
import { runImport, type IImportResult } from "./import-run.server";
import { stagingFileSchema, type StagingFile } from "./import-schemas";

type Parsed =
  | { ok: true; file: StagingFile }
  | { ok: false; error: ImportFileError; issues: string[] };

function parseStagingJson(json: string): Parsed {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: "invalid_json", issues: [] };
  }
  const parsed = stagingFileSchema.safeParse(raw);
  if (!parsed.success)
    return {
      ok: false,
      error: "invalid_file",
      issues: issuesOf(parsed.error),
    };
  if (parsed.data.site !== site.id)
    return { ok: false, error: "wrong_site", issues: [parsed.data.site] };
  return { ok: true, file: parsed.data };
}

// Paths only, never values: the file holds contact data that must not end up in logs or error text.
function issuesOf(error: ZodError): string[] {
  return error.issues.slice(0, 10).map((issue) => issue.path.join("."));
}

export type PreviewResult =
  | { ok: true; plan: IImportPlan }
  | { ok: false; error: ImportFileError; issues: string[] };

export async function previewStagingFile(json: string): Promise<PreviewResult> {
  const parsed = parseStagingJson(json);
  if (!parsed.ok) return parsed;
  return { ok: true, plan: await planImport(parsed.file) };
}

export type RunResult =
  | { ok: true; result: IImportResult }
  | { ok: false; error: ImportFileError; issues: string[] };

export async function runStagingFile(json: string): Promise<RunResult> {
  const parsed = parseStagingJson(json);
  if (!parsed.ok) return parsed;
  return { ok: true, result: await runImport(parsed.file) };
}
