import type { AppLocale } from "@/constants/locales";

export interface ITagText {
  labelEn: string;
  labelHr: string;
  aliasesEn: readonly string[];
  aliasesHr: readonly string[];
}

export function tagLabel(
  tag: Pick<ITagText, "labelEn" | "labelHr">,
  locale: AppLocale,
): string {
  return locale === "hr" ? tag.labelHr : tag.labelEn;
}

export function tagAliases(
  tag: Pick<ITagText, "aliasesEn" | "aliasesHr">,
  locale: AppLocale,
): readonly string[] {
  return locale === "hr" ? tag.aliasesHr : tag.aliasesEn;
}

// Croatian đ has no NFD decomposition, so it is mapped by hand before stripping marks.
export function foldText(text: string): string {
  return text
    .toLowerCase()
    .replaceAll("đ", "dj")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

export function tagMatchesQuery(
  tag: ITagText,
  query: string,
  locale: AppLocale,
): boolean {
  const needle = foldText(query);
  if (!needle) return true;
  return [tagLabel(tag, locale), ...tagAliases(tag, locale)].some((text) =>
    foldText(text).includes(needle),
  );
}
