import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { m } from "@/paraglide/messages";

import type { ILinkTarget } from "../connections-schemas";
import { targetSearchQuery } from "../connections-queries";

const DEBOUNCE_MS = 300;
const MIN_QUERY = 2;
const NO_SELECTION = null as ILinkTarget | null;

interface ITargetSearchProps {
  id: string;
  selectedName: string;
  errors?: ({ message?: string } | undefined)[];
  onPick: (target: ILinkTarget) => void;
  // Typing again invalidates the earlier pick.
  onClear: () => void;
}

// The server ranks and limits the matches, so Base UI must not filter them again (filter={null}).
export default function TargetSearch({
  id,
  selectedName,
  errors,
  onPick,
  onClear,
}: ITargetSearchProps) {
  const [text, setText] = useState("");
  const debounced = useDebouncedValue(text.trim(), DEBOUNCE_MS);
  const search = useQuery({
    ...targetSearchQuery(debounced),
    enabled: debounced.length >= MIN_QUERY,
  });
  const hits = search.data ?? [];
  const invalid = Boolean(errors?.length);

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={id}>{m.connections_field_search()}</FieldLabel>
      <Combobox
        items={hits}
        filter={null}
        value={NO_SELECTION}
        inputValue={text}
        onInputValueChange={(value, details) => {
          if (details.reason !== "input-change") return;
          setText(value);
          if (selectedName) onClear();
        }}
        onValueChange={(target) => {
          if (!target) return;
          setText(target.name);
          onPick(target);
        }}
        itemToStringLabel={(target) => target?.name ?? ""}
        isItemEqualToValue={(a, b) => a?.id === b?.id}
      >
        <ComboboxInput
          id={id}
          showTrigger={false}
          autoComplete="off"
          aria-invalid={invalid}
          placeholder={m.connections_search_placeholder()}
        />
        <ComboboxContent>
          {search.isSuccess ? (
            <ComboboxEmpty>{m.connections_search_none()}</ComboboxEmpty>
          ) : null}
          <ComboboxList>
            {(target: ILinkTarget) => (
              <ComboboxItem key={target.id} value={target}>
                <span className="flex flex-col">
                  <span>{target.name}</span>
                  {target.city ? (
                    <span className="text-xs">
                      {[target.city, target.countryCode]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  ) : null}
                </span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {selectedName ? (
        <FieldDescription>
          {m.connections_search_selected({ name: selectedName })}
        </FieldDescription>
      ) : null}
      {invalid ? <FieldError errors={errors} /> : null}
    </Field>
  );
}
