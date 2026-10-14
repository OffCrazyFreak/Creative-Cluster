import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ENTRY_KINDS, ENTRY_STATUSES } from "@/constants/entry";
import { LOCATION_COUNTRIES } from "@/constants/countries";
import FilterSelect from "@/features/review/components/filter-select";
import { statusLabel } from "@/features/lifecycle/status-label";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import type { AdminEntriesSearch } from "../admin-entries-schemas";
import { kindLabel } from "../entry-kind-label";

interface IEntriesFiltersProps {
  value: AdminEntriesSearch;
  onChange: (value: Partial<AdminEntriesSearch>) => void;
}

const ALL = "all";

function pick<T extends string>(list: readonly T[], value: string) {
  return list.find((item) => item === value);
}

function countryOptions() {
  const names = new Intl.DisplayNames([getLocale()], { type: "region" });
  return LOCATION_COUNTRIES.map((code) => ({
    value: code,
    label: names.of(code) ?? code,
  })).sort((a, b) => a.label.localeCompare(b.label, getLocale()));
}

interface IToggleProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function Toggle({ id, label, checked, onChange }: IToggleProps) {
  return (
    <Field orientation="horizontal" className="w-full sm:w-auto">
      <Checkbox id={id} checked={checked} onCheckedChange={onChange} />
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
    </Field>
  );
}

export default function EntriesFilters({
  value,
  onChange,
}: IEntriesFiltersProps) {
  const [text, setText] = useState(value.q ?? "");
  const all = { value: ALL, label: m.review_filter_all() };

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
          <FieldLabel htmlFor="entries-q">
            {m.admin_entries_filter_search()}
          </FieldLabel>
          <Input
            id="entries-q"
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
          id="entries-status"
          label={m.admin_entries_filter_status()}
          value={value.status ?? ALL}
          options={[
            all,
            ...ENTRY_STATUSES.map((item) => ({
              value: item,
              label: statusLabel(item),
            })),
          ]}
          onChange={(next) =>
            onChange({ status: pick(ENTRY_STATUSES, next), page: 1 })
          }
        />
        <FilterSelect
          id="entries-kind"
          label={m.admin_entries_filter_kind()}
          value={value.kind ?? ALL}
          options={[
            all,
            ...ENTRY_KINDS.map((item) => ({
              value: item,
              label: kindLabel(item),
            })),
          ]}
          onChange={(next) =>
            onChange({ kind: pick(ENTRY_KINDS, next), page: 1 })
          }
        />
        <FilterSelect
          id="entries-country"
          label={m.admin_entries_filter_country()}
          value={value.country ?? ALL}
          options={[all, ...countryOptions()]}
          onChange={(next) =>
            onChange({ country: pick(LOCATION_COUNTRIES, next), page: 1 })
          }
        />
        <FilterSelect
          id="entries-trusted"
          label={m.admin_entries_filter_trusted()}
          value={value.trusted ?? ALL}
          options={[
            all,
            { value: "yes", label: m.admin_entries_trusted_yes() },
            { value: "no", label: m.admin_entries_trusted_no() },
          ]}
          onChange={(next) =>
            onChange({ trusted: pick(["yes", "no"], next), page: 1 })
          }
        />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Toggle
          id="entries-stale"
          label={m.admin_entries_filter_stale()}
          checked={value.stale === true}
          onChange={(checked) =>
            onChange({ stale: checked || undefined, page: 1 })
          }
        />
        <Toggle
          id="entries-unclaimed"
          label={m.admin_entries_filter_unclaimed()}
          checked={value.unclaimed === true}
          onChange={(checked) =>
            onChange({ unclaimed: checked || undefined, page: 1 })
          }
        />
        <Toggle
          id="entries-email-invalid"
          label={m.admin_entries_filter_email_invalid()}
          checked={value.emailInvalid === true}
          onChange={(checked) =>
            onChange({ emailInvalid: checked || undefined, page: 1 })
          }
        />
      </div>
    </div>
  );
}
