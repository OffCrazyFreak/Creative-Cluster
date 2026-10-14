import type { AppLocale } from "@/constants/locales";
import { hasMatchingTags } from "@/lib/rich-text/translation-blocks";

import { detectLocale } from "./detect-locale";

export const MIN_LENGTH_RATIO = 0.8;
export const MAX_LENGTH_RATIO = 1.5;
// Short strings (a title of two words) legitimately change length a lot.
const RATIO_MIN_SOURCE_CHARS = 30;

export type TranslationFailure =
  | "block_count"
  | "empty"
  | "length_ratio"
  | "paragraphs"
  | "urls"
  | "tags"
  | "language"
  | "unchanged";

// Names and one-word labels are legitimately identical in both languages.
const MIN_ECHO_CHARS = 12;

const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;

function urlList(value: string) {
  return (value.match(URL_PATTERN) ?? []).sort();
}

function lineCount(value: string) {
  return value.split("\n").filter((line) => line.trim()).length;
}

function plain(value: string) {
  return value.replace(/<\/?\d+>/g, "");
}

// null means the translation of one field (all its blocks) may be stored.
export function validateTranslation(
  source: string[],
  translated: string[],
  to: AppLocale,
  glossary: string[] = [],
): TranslationFailure | null {
  if (translated.length !== source.length) return "block_count";
  if (translated.some((block) => !block.trim())) return "empty";

  const sourceChars = plain(source.join("")).length;
  if (sourceChars >= RATIO_MIN_SOURCE_CHARS) {
    const ratio = plain(translated.join("")).length / sourceChars;
    if (ratio < MIN_LENGTH_RATIO || ratio > MAX_LENGTH_RATIO)
      return "length_ratio";
  }

  for (const [index, block] of source.entries()) {
    const out = translated[index];
    if (lineCount(block) !== lineCount(out)) return "paragraphs";
    if (urlList(block).join(" ") !== urlList(out).join(" ")) return "urls";
    if (!hasMatchingTags(block, out)) return "tags";
  }

  // A model that echoes a short field back would pass every other check.
  const echoed = source.every(
    (block, index) =>
      block.trim().toLowerCase() === translated[index].trim().toLowerCase() &&
      !glossary.some(
        (term) => term.toLowerCase() === block.trim().toLowerCase(),
      ),
  );
  if (echoed && plain(source.join("")).length >= MIN_ECHO_CHARS)
    return "unchanged";

  const language = detectLocale(translated.join("\n"));
  if (language && language !== to) return "language";
  return null;
}
