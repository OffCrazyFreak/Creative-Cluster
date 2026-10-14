import type { AppLocale } from "@/constants/locales";

export interface ITranslateInput {
  // One string per paragraph or short field; inline tags like <1>..</1> must come back unchanged.
  blocks: string[];
  from: AppLocale;
  to: AppLocale;
  // Terms that must stay exactly as written (entry name, brand terms).
  glossary: string[];
}

export interface ITranslationAdapter {
  // Provider label stored with each machine row.
  name: string;
  // Same length and order as `blocks`, or null when this adapter cannot translate (local stand-in).
  translate(input: ITranslateInput): Promise<string[] | null>;
}

// The daily free allocation is used up: retry after the reset, not with backoff.
export class TranslationQuotaError extends Error {}

// The model answered, but not in the shape asked for. Counts as a failed validation.
export class TranslationOutputError extends Error {}

// eTranslation (EU Commission) is a v2 adapter behind this same interface; it answers by
// callback, so it needs a random-token callback route that does not exist yet.
