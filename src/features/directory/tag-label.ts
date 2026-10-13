import type { AppLocale } from "@/constants/locales";

export function tagLabel(
  tag: { labelEn: string; labelHr: string },
  locale: AppLocale,
): string {
  return locale === "hr" ? tag.labelHr : tag.labelEn;
}
