import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  CHANGE_ACTIONS,
  CHANGE_SOURCES,
  MODERATED_ENTITIES,
} from "@/constants/moderation";
import FilterSelect from "@/features/review/components/filter-select";
import { m } from "@/paraglide/messages";

import { actionLabel, entityLabel, sourceLabel } from "../changes-labels";
import type { ChangesListInput } from "../changes-schemas";

interface IChangesFiltersProps {
  value: ChangesListInput;
  onChange: (value: Partial<ChangesListInput>) => void;
}

const ALL = "all";

function pick<T extends string>(list: readonly T[], value: string) {
  return list.find((item) => item === value);
}

export default function ChangesFilters({
  value,
  onChange,
}: IChangesFiltersProps) {
  const [entityId, setEntityId] = useState(value.entityId ?? "");
  const all = { value: ALL, label: m.review_filter_all() };
  const idValid = /^[0-9a-f-]{36}$/i.test(entityId);

  return (
    <form
      className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        onChange({
          entityId: idValid ? entityId.toLowerCase() : undefined,
          page: 1,
        });
      }}
    >
      <FilterSelect
        id="changes-entity"
        label={m.review_changes_filter_entity()}
        value={value.entityType ?? ALL}
        options={[
          all,
          ...MODERATED_ENTITIES.map((item) => ({
            value: item,
            label: entityLabel(item),
          })),
        ]}
        onChange={(next) =>
          onChange({ entityType: pick(MODERATED_ENTITIES, next), page: 1 })
        }
      />
      <FilterSelect
        id="changes-source"
        label={m.review_changes_filter_source()}
        value={value.source ?? ALL}
        options={[
          all,
          ...CHANGE_SOURCES.map((item) => ({
            value: item,
            label: sourceLabel(item),
          })),
        ]}
        onChange={(next) =>
          onChange({ source: pick(CHANGE_SOURCES, next), page: 1 })
        }
      />
      <FilterSelect
        id="changes-action"
        label={m.review_changes_filter_action()}
        value={value.action ?? ALL}
        options={[
          all,
          ...CHANGE_ACTIONS.map((item) => ({
            value: item,
            label: actionLabel(item),
          })),
        ]}
        onChange={(next) =>
          onChange({ action: pick(CHANGE_ACTIONS, next), page: 1 })
        }
      />
      <Field className="w-full sm:w-72">
        <FieldLabel htmlFor="changes-id">
          {m.review_changes_filter_id()}
        </FieldLabel>
        <Input
          id="changes-id"
          value={entityId}
          autoComplete="off"
          onChange={(event) => setEntityId(event.target.value.trim())}
        />
      </Field>
      <Button type="submit" variant="outline">
        {m.review_changes_filter_apply()}
      </Button>
    </form>
  );
}
