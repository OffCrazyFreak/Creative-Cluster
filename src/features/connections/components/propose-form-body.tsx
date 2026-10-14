import { useQueryClient } from "@tanstack/react-query";
import { useId } from "react";
import { toast } from "sonner";

import { useAppForm } from "@/components/custom/form/app-form";
import { FieldGroup } from "@/components/ui/field";
import { LINK_KINDS } from "@/constants/links";
import { m } from "@/paraglide/messages";

import { CONNECTIONS_QUERY_KEY } from "../connections-queries";
import { proposeConnection } from "../connections.functions";
import { kindLabel } from "../connection-kind-label";
import {
  emptyProposeValues,
  proposeFormSchema,
  toProposeInput,
} from "../propose-form-schema";
import type { ProposeError } from "../connections-schemas";
import ProposeDirectionField from "./propose-direction-field";
import ProposeTargetFields from "./propose-target-fields";

const ERROR_TEXT: Record<ProposeError, () => string> = {
  exists: () => m.connections_error_exists(),
  cooldown: () => m.connections_error_cooldown(),
  limit: () => m.connections_error_limit(),
  target_unavailable: () => m.connections_error_target_unavailable(),
};

export interface IProposeFormBodyProps {
  entries: { id: string; name: string }[];
  onSent: () => void;
}

export default function ProposeFormBody({
  entries,
  onSent,
}: IProposeFormBodyProps) {
  const queryClient = useQueryClient();
  const headingId = useId();
  const form = useAppForm({
    defaultValues: emptyProposeValues(entries[0].id),
    validators: { onChange: proposeFormSchema },
    onSubmit: async ({ value }) => {
      try {
        const result = await proposeConnection({
          data: toProposeInput(value),
        });
        if (!result.ok) {
          toast.error(ERROR_TEXT[result.error]());
          return;
        }
        toast.success(
          value.outside
            ? m.connections_done_outside()
            : m.connections_done_propose(),
        );
        await queryClient.invalidateQueries({
          queryKey: CONNECTIONS_QUERY_KEY,
        });
        onSent();
      } catch {
        toast.error(m.connections_failed());
      }
    },
  });

  return (
    <form
      aria-labelledby={headingId}
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <h2 id={headingId} className="text-lg font-semibold">
        {m.connections_propose_title()}
      </h2>
      <FieldGroup>
        {entries.length > 1 ? (
          <form.AppField name="fromEntryId">
            {(field) => (
              <field.SelectField
                label={m.connections_field_listing()}
                options={entries.map((entry) => ({
                  value: entry.id,
                  label: entry.name,
                }))}
              />
            )}
          </form.AppField>
        ) : null}
        <ProposeTargetFields form={form} />
        <form.AppField name="kind">
          {(field) => (
            <field.SelectField
              label={m.connections_field_kind()}
              options={LINK_KINDS.map((kind) => ({
                value: kind,
                label: kindLabel(kind),
              }))}
            />
          )}
        </form.AppField>
        <ProposeDirectionField form={form} />
        <form.AppField name="year">
          {(field) => <field.TextField label={m.connections_field_year()} />}
        </form.AppField>
        <form.AppField name="endYear">
          {(field) => (
            <field.TextField label={m.connections_field_end_year()} />
          )}
        </form.AppField>
        <form.AppField name="project">
          {(field) => <field.TextField label={m.connections_field_project()} />}
        </form.AppField>
        <form.AppField name="note">
          {(field) => (
            <field.TextAreaField label={m.connections_field_note()} />
          )}
        </form.AppField>
        <form.Subscribe selector={(state) => state.values.outside}>
          {(outside) => (
            <form.AppField name="evidenceUrl">
              {(field) => (
                <field.TextField
                  label={m.connections_field_evidence()}
                  description={
                    outside
                      ? m.connections_evidence_hint_outside()
                      : m.connections_evidence_hint()
                  }
                />
              )}
            </form.AppField>
          )}
        </form.Subscribe>
      </FieldGroup>
      <form.AppForm>
        <form.Subscribe selector={(state) => state.values.outside}>
          {(outside) => (
            <form.SubmitButton>
              {outside
                ? m.connections_submit_outside()
                : m.connections_submit()}
            </form.SubmitButton>
          )}
        </form.Subscribe>
      </form.AppForm>
    </form>
  );
}
