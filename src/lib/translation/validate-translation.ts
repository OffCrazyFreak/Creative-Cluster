import type { AppLocale } from "@/constants/locales";
import { stripInlineTags } from "@/lib/rich-text/inline-tags";
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

const plain = stripInlineTags;

// Words that could have been translated: URLs and emails alone are legitimately identical.
function wordCount(value: string) {
  const text = plain(value)
    .replace(URL_PATTERN, "")
    .replace(/\S+@\S+/g, "");
  return (text.match(/\p{L}{2,}/gu) ?? []).length;
}

// A model that echoes a block back would pass every count check.
function isEchoed(source: string, out: string, glossary: string[]) {
  const same = source.trim().toLowerCase() === out.trim().toLowerCase();
  if (!same) return false;
  if (
    glossary.some((term) => term.toLowerCase() === source.trim().toLowerCase())
  )
    return false;
  return plain(source).length >= MIN_ECHO_CHARS && wordCount(source) >= 2;
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
    if (isEchoed(block, out, glossary)) return "unchanged";
    // One paragraph left in the source language must not hide behind translated ones.
    const blockLanguage = detectLocale(out);
    if (blockLanguage && blockLanguage !== to) return "language";
  }

  const language = detectLocale(translated.join("\n"));
  if (language && language !== to) return "language";
  return null;
}
