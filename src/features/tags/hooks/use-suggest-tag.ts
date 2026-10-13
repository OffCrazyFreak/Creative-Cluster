import { useQueryClient } from "@tanstack/react-query";

import type { AppLocale } from "@/constants/locales";

import { pickerTagsQuery } from "../tag-queries";
import type { ITagOption } from "../tag-schemas";
import { suggestNewTag } from "../tags.functions";

// Returns an onSuggest callback for TagPicker; the new tag joins the cached options at once.
export function useSuggestTag(locale: AppLocale) {
  const queryClient = useQueryClient();
  return async function onSuggest(label: string): Promise<ITagOption> {
    const { tag } = await suggestNewTag({ data: { label, locale } });
    queryClient.setQueryData(pickerTagsQuery().queryKey, (current) =>
      current?.some((option) => option.id === tag.id)
        ? current
        : [...(current ?? []), tag],
    );
    return tag;
  };
}
