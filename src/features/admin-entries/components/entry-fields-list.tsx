import { m } from "@/paraglide/messages";
import { formatDate } from "@/utils/format-date";

import type { IDetailField } from "../admin-entries-schemas";
import { fieldLabel } from "../detail-field-label";

function show(field: IDetailField): string {
  if (field.value === null) return m.admin_entries_empty_value();
  if (field.type === "bool")
    return field.value === "true"
      ? m.admin_entries_yes()
      : m.admin_entries_no();
  if (field.type === "date") return formatDate(field.value);
  return field.value;
}

interface IEntryFieldsListProps {
  fields: IDetailField[];
}

export default function EntryFieldsList({ fields }: IEntryFieldsListProps) {
  return (
    <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[12rem_1fr]">
      {fields.map((field) => (
        <div key={field.key} className="contents">
          <dt className="font-medium">{fieldLabel(field.key)}</dt>
          <dd className="min-w-0 break-words whitespace-pre-wrap">
            {show(field)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
