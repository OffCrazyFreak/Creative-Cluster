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
  const groups: IPickerGroup[] = parents.map((parent) => ({
    value: tagLabel(parent, locale),
    items: [
      parent,
      ...sorted.filter((option) => option.parentId === parent.id),
    ],
  }));
  const grouped = new Set(
    groups.flatMap((g) => g.items.map((item) => item.id)),
  );
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
