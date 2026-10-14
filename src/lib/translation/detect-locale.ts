import { detect } from "tinyld";

import { stripInlineTags } from "@/lib/rich-text/inline-tags";
import type { AppLocale } from "@/constants/locales";

// tinyld has no Croatian profile and files Croatian text under its closest relatives.
const SERBO_CROATIAN = ["sr", "bs", "hr"];

// Below this many characters the detector is guessing, so the check is skipped.
export const MIN_DETECTABLE_CHARS = 40;

// null when the text is too short to tell.
export function detectLocale(text: string): AppLocale | null {
  const plain = stripInlineTags(text).trim();
  if (plain.length < MIN_DETECTABLE_CHARS) return null;
  const code = detect(plain, { only: ["en", ...SERBO_CROATIAN] });
  if (code === "en") return "en";
  return SERBO_CROATIAN.includes(code) ? "hr" : null;
}

// For the owner area on save: the detected language, or the fallback for short text.
export function detectSourceLocale(
  text: string,
  fallback: AppLocale,
): AppLocale {
  return detectLocale(text) ?? fallback;
}

// Detection runs when the text changes, so a language the owner corrected by hand survives saves that
// leave the text alone. Short text keeps the chosen language. No previous text means a new record.
export function sourceLocaleOnSave(
  text: string,
  chosen: AppLocale,
  previousText?: string,
): AppLocale {
  if (previousText === text) return chosen;
  return detectSourceLocale(text, chosen);
}
