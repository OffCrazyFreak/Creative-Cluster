import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LINK_KINDS } from "@/constants/links";
import FilterSelect from "@/features/review/components/filter-select";
import { m } from "@/paraglide/messages";

import type { AdminLinksSearch } from "../admin-links-schemas";
import { kindLabel } from "../connection-kind-label";

interface IAdminLinksFiltersProps {
  value: AdminLinksSearch;
  onChange: (value: Partial<AdminLinksSearch>) => void;
}

const ALL = "all";

export default function AdminLinksFilters({
  value,
  onChange,
}: IAdminLinksFiltersProps) {
  const [text, setText] = useState(value.q ?? "");

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-4 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          onChange({ q: text.trim() || undefined, page: 1 });
        }}
      >
        <Field className="w-full sm:w-72">
          <FieldLabel htmlFor="links-q">
            {m.admin_links_filter_search()}
          </FieldLabel>
          <Input
            id="links-q"
            type="search"
            value={text}
            maxLength={100}
            autoComplete="off"
            onChange={(event) => setText(event.target.value)}
          />
        </Field>
        <Button type="submit" variant="outline" className="max-sm:min-h-11">
          {m.admin_entries_filter_apply()}
        </Button>
      </form>
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <FilterSelect
          id="links-kind"
          label={m.admin_links_filter_kind()}
          value={value.kind ?? ALL}
          options={[
            { value: ALL, label: m.review_filter_all() },
            ...LINK_KINDS.map((item) => ({
              value: item,
              label: kindLabel(item),
            })),
          ]}
          onChange={(next) =>
            onChange({
              kind: LINK_KINDS.find((item) => item === next),
              page: 1,
            })
          }
        />
        <Field orientation="horizontal" className="w-full sm:w-auto">
          <Checkbox
            id="links-unclaimed"
            checked={value.unclaimed === true}
            onCheckedChange={(checked) =>
              onChange({ unclaimed: checked || undefined, page: 1 })
            }
          />
          <FieldLabel htmlFor="links-unclaimed">
            {m.admin_links_filter_unclaimed()}
          </FieldLabel>
        </Field>
      </div>
    </div>
  );
}
