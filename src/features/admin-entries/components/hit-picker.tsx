import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { m } from "@/paraglide/messages";

import { ADMIN_KEY } from "../admin-entries-queries";

interface IHit {
  id: string;
}

interface IHitPickerProps<T extends IHit> {
  id: string;
  label: string;
  queryKey: string;
  search: (q: string) => Promise<T[]>;
  describe: (hit: T) => ReactNode;
  onSelect: (hit: T | null) => void;
}

// Type to search, pick one result. The query only runs from two characters.
export default function HitPicker<T extends IHit>({
  id,
  label,
  queryKey,
  search,
  describe,
  onSelect,
}: IHitPickerProps<T>) {
  const [text, setText] = useState("");
  const q = useDebouncedValue(text.trim(), 300);
  const { data } = useQuery({
    queryKey: [...ADMIN_KEY, queryKey, q],
    queryFn: () => search(q),
    enabled: q.length >= 2,
  });
  const hits = q.length >= 2 ? (data ?? []) : [];

  return (
    <div className="flex flex-col gap-3">
      <Field>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <Input
          id={id}
          type="search"
          value={text}
          autoComplete="off"
          onChange={(event) => {
            setText(event.target.value);
            onSelect(null);
          }}
        />
      </Field>
      {q.length >= 2 && data && hits.length === 0 && (
        <p role="status">{m.admin_entries_no_hits()}</p>
      )}
      {hits.length > 0 && (
        <RadioGroup
          aria-label={label}
          onValueChange={(value) =>
            onSelect(hits.find((hit) => hit.id === value) ?? null)
          }
        >
          {hits.map((hit) => (
            <label
              key={hit.id}
              className="flex min-h-11 items-center gap-2 sm:min-h-0"
            >
              <RadioGroupItem value={hit.id} />
              <span>{describe(hit)}</span>
            </label>
          ))}
        </RadioGroup>
      )}
    </div>
  );
}
