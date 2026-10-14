import type { AppLocale } from "@/constants/locales";

import { tagLabel, tagMatchesQuery } from "../tag-label";
import type { ITagOption } from "../tag-schemas";

export interface ISuggestItem {
  suggest: true;
  id: "__suggest__";
  query: string;
}

export type PickerItem = ITagOption | ISuggestItem;

export interface IPickerGroup {
  value: string;
  items: PickerItem[];
}

export function unknownTag(id: string, label: string): ITagOption {
  return {
    id,
    slug: id,
    labelEn: label,
    labelHr: label,
    aliasesEn: [],
    aliasesHr: [],
    parentId: null,
    status: "active",
  };
}

export function isSuggestItem(item: PickerItem): item is ISuggestItem {
  return "suggest" in item;
}

function byLabel(locale: AppLocale) {
  return (a: ITagOption, b: ITagOption) =>
    tagLabel(a, locale).localeCompare(tagLabel(b, locale), locale);
}

// A parent heads its group and is itself selectable; tags without a family share one trailing group.
export function buildGroups(
  tags: readonly ITagOption[],
  locale: AppLocale,
  otherLabel: string,
  suggestQuery: string,
): IPickerGroup[] {
  const sorted = [...tags].sort(byLabel(locale));
  const parentIds = new Set(
    sorted.flatMap((option) => (option.parentId ? [option.parentId] : [])),
  );
  const parents = sorted.filter((option) => parentIds.has(option.id));
  // Each tag appears once even if the data nests deeper than two levels.
  const grouped = new Set<string>();
  const groups: IPickerGroup[] = parents.flatMap((parent) => {
    const items = [
      parent,
      ...sorted.filter((option) => option.parentId === parent.id),
    ].filter((option) => !grouped.has(option.id));
    items.forEach((option) => grouped.add(option.id));
    return items.length ? [{ value: tagLabel(parent, locale), items }] : [];
  });
  const rest = sorted.filter((option) => !grouped.has(option.id));
  if (rest.length) groups.push({ value: otherLabel, items: rest });
  if (suggestQuery) {
    const suggest: ISuggestItem = {
      suggest: true,
      id: "__suggest__",
      query: suggestQuery,
    };
    groups.push({ value: "", items: [suggest] });
  }
  return groups;
}

export function pickerFilter(locale: AppLocale) {
  return (item: PickerItem, query: string) =>
    isSuggestItem(item) || tagMatchesQuery(item, query, locale);
}
