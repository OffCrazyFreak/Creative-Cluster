import type { AppLocale } from "@/constants/locales";
import { RichTextError } from "@/lib/rich-text/rich-text-error";
import { rebuildRichText } from "@/lib/rich-text/translation-blocks";

import {
  TranslationOutputError,
  type ITranslationAdapter,
} from "./translation-adapter";
import type { ISourceField } from "./translation-source.server";
import { validateTranslation } from "./validate-translation";

export type FieldOutcome =
  | { status: "ok"; text: string }
  | { status: "invalid" }
  | { status: "unavailable" };

interface IFieldContext {
  adapter: ITranslationAdapter;
  from: AppLocale;
  to: AppLocale;
  glossary: string[];
}

function acceptField(
  field: ISourceField,
  translated: string[],
  { to, glossary }: IFieldContext,
): string | null {
  const failure = validateTranslation(field.blocks, translated, to, glossary);
  if (failure) {
    console.warn(`Translation of ${field.field} rejected: ${failure}`);
    return null;
  }
  if (!field.skeleton) return translated[0];
  try {
    return JSON.stringify(rebuildRichText(field.skeleton, translated).doc);
  } catch (error) {
    if (error instanceof RichTextError) return null;
    throw error;
  }
}

async function attempt(field: ISourceField, context: IFieldContext) {
  const { adapter, from, to, glossary } = context;
  try {
    const out = await adapter.translate({
      blocks: field.blocks,
      from,
      to,
      glossary,
    });
    if (!out) return "unavailable" as const;
    return acceptField(field, out, context);
  } catch (error) {
    if (!(error instanceof TranslationOutputError)) throw error;
    console.warn(`Translation of ${field.field} rejected: ${error.message}`);
    return null;
  }
}

// One request per field keeps a long description from truncating the short fields with it.
// One retry; null text means nothing may be stored. Quota errors propagate to the job.
export async function translateField(
  field: ISourceField,
  context: IFieldContext,
): Promise<FieldOutcome> {
  for (let tries = 0; tries < 2; tries++) {
    const result = await attempt(field, context);
    if (result === "unavailable") return { status: "unavailable" };
    if (result !== null) return { status: "ok", text: result };
  }
  return { status: "invalid" };
}
