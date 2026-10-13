import { useMemo, useState } from "react";

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import type { AppLocale } from "@/constants/locales";
import { MAX_TAGS_PER_FIELD } from "@/constants/tags";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { tagLabel } from "../tag-label";
import type { ITagOption } from "../tag-schemas";
import {
  buildGroups,
  unknownTag,
  isSuggestItem,
  pickerFilter,
  type IPickerGroup,
  type PickerItem,
} from "./tag-picker-groups";

export interface ITagPickerProps {
  /** Every tag the viewer may pick (from pickerTagsQuery). */
  tags: readonly ITagOption[];
  /** Selected tag ids. */
  value: readonly string[];
  onValueChange: (tagIds: string[]) => void;
  /** Creates a suggestion; omit it to hide the "Suggest a new tag" row. */
  onSuggest?: (label: string) => Promise<ITagOption>;
  /** Id for the input, so a <Label htmlFor> can name it. */
  id?: string;
  max?: number;
  locale?: AppLocale;
  disabled?: boolean;
}

export default function TagPicker({
  tags,
  value,
  onValueChange,
  onSuggest,
  id,
  max = MAX_TAGS_PER_FIELD,
  locale = getLocale(),
  disabled,
}: ITagPickerProps) {
  const anchor = useComboboxAnchor();
  const [query, setQuery] = useState("");
  const [failed, setFailed] = useState(false);

  // Ids missing from the options (still loading, or not listable for this viewer) stay selected under a
  // fallback label, so saving never wipes tags the picker could not show.
  const selected = useMemo(
    () =>
      value.map(
        (tagId) =>
          tags.find((option) => option.id === tagId) ??
          unknownTag(tagId, m.tags_picker_unknown()),
      ),
    [tags, value],
  );
  const selectedIds = new Set(selected.map((option) => option.id));
  const atLimit = selected.length >= max;

  const trimmed = query.trim();
  const groups = useMemo(
    () =>
      buildGroups(
        tags,
        locale,
        m.tags_picker_other_group(),
        onSuggest && trimmed.length >= 2 ? trimmed : "",
      ),
    [tags, locale, onSuggest, trimmed],
  );

  async function handleChange(next: PickerItem[]) {
    const picked = next.filter(
      (item): item is ITagOption => !isSuggestItem(item),
    );
    const suggestion = next.find(isSuggestItem);
    const ids = picked.map((option) => option.id).slice(0, max);
    if (!suggestion || !onSuggest) return onValueChange(ids);
    try {
      setFailed(false);
      const created = await onSuggest(suggestion.query);
      onValueChange([...new Set([...ids, created.id])].slice(0, max));
    } catch {
      setFailed(true);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Combobox
        multiple
        items={groups}
        value={selected}
        onValueChange={(next) => void handleChange(next)}
        inputValue={query}
        onInputValueChange={setQuery}
        filter={pickerFilter(locale)}
        isItemEqualToValue={(a: PickerItem, b: PickerItem) => a.id === b.id}
        itemToStringLabel={(item: PickerItem) =>
          isSuggestItem(item) ? item.query : tagLabel(item, locale)
        }
        disabled={disabled}
      >
        <ComboboxChips ref={anchor}>
          <ComboboxValue>
            {(chips: ITagOption[]) => (
              <>
                {chips.map((option) => (
                  <ComboboxChip key={option.id}>
                    {tagLabel(option, locale)}
                  </ComboboxChip>
                ))}
                <ComboboxChipsInput
                  id={id}
                  placeholder={chips.length ? "" : m.tags_picker_placeholder()}
                />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchor}>
          <ComboboxEmpty>{m.tags_picker_empty()}</ComboboxEmpty>
          <ComboboxList>
            {(group: IPickerGroup) => (
              <ComboboxGroup key={group.value || "suggest"} items={group.items}>
                {group.value && <ComboboxLabel>{group.value}</ComboboxLabel>}
                <ComboboxCollection>
                  {(item: PickerItem) => (
                    <ComboboxItem
                      key={item.id}
                      value={item}
                      disabled={atLimit && !selectedIds.has(item.id)}
                    >
                      {isSuggestItem(item)
                        ? m.tags_picker_suggest({ label: item.query })
                        : tagLabel(item, locale)}
                    </ComboboxItem>
                  )}
                </ComboboxCollection>
              </ComboboxGroup>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <p className="text-sm">
        {m.tags_picker_count({ count: selected.length, max })}
      </p>
      {failed && <p role="alert">{m.tags_picker_suggest_failed()}</p>}
    </div>
  );
}
