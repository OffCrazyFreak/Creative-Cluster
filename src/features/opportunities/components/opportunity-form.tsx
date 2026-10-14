import { revalidateLogic } from "@tanstack/react-form";
import { useState } from "react";

import { useAppForm } from "@/components/custom/form/app-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { LOCALE_NAMES, LOCALES } from "@/constants/locales";
import {
  OPPORTUNITY_CATEGORIES,
  OPPORTUNITY_LIMITS,
  OPPORTUNITY_TYPES,
} from "@/constants/opportunities";
import { m } from "@/paraglide/messages";

import { categoryLabel, refusedLabel, typeLabel } from "../opportunity-labels";
import {
  validateOpportunity,
  type OpportunityFormValues,
  type OpportunityResult,
} from "../opportunity-schemas";
import OpportunityTagField from "./opportunity-tag-field";

interface IOpportunityFormProps {
  initial: OpportunityFormValues;
  submitLabel: string;
  onSubmit: (values: OpportunityFormValues) => Promise<OpportunityResult>;
  onDone: (result: Exclude<OpportunityResult, { status: "refused" }>) => void;
  onCancel: () => void;
}

export default function OpportunityForm({
  initial,
  submitLabel,
  onSubmit,
  onDone,
  onCancel,
}: IOpportunityFormProps) {
  const [error, setError] = useState<string | null>(null);

  const form = useAppForm({
    defaultValues: initial,
    validationLogic: revalidateLogic({
      mode: "submit",
      modeAfterSubmission: "change",
    }),
    validators: { onDynamic: validateOpportunity },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const result = await onSubmit(value);
        if (result.status === "refused") setError(refusedLabel(result.code));
        else onDone(result);
      } catch {
        setError(m.opportunities_notice_failed());
      }
    },
  });

  return (
    <form
      className="flex flex-col gap-6"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.AppField name="type">
          {(field) => (
            <field.SelectField
              label={m.opportunities_field_type()}
              options={OPPORTUNITY_TYPES.map((value) => ({
                value,
                label: typeLabel(value),
              }))}
            />
          )}
        </form.AppField>
        <form.AppField name="category">
          {(field) => (
            <field.SelectField
              label={m.opportunities_field_category()}
              options={OPPORTUNITY_CATEGORIES.map((value) => ({
                value,
                label: categoryLabel(value),
              }))}
            />
          )}
        </form.AppField>
        <form.AppField name="title">
          {(field) => <field.TextField label={m.opportunities_field_title()} />}
        </form.AppField>
        <form.AppField name="sourceLocale">
          {(field) => (
            <field.SelectField
              label={m.opportunities_field_source_locale()}
              options={LOCALES.map((value) => ({
                value,
                label: LOCALE_NAMES[value],
              }))}
            />
          )}
        </form.AppField>
        <form.Subscribe selector={(state) => state.values.sourceLocale}>
          {(locale) => (
            <form.AppField name="body">
              {(field) => (
                <field.RichTextField
                  label={m.opportunities_field_body()}
                  maxChars={OPPORTUNITY_LIMITS.bodyLength}
                  lang={locale}
                />
              )}
            </form.AppField>
          )}
        </form.Subscribe>
        <form.AppField name="remoteOk">
          {(field) => (
            <field.CheckboxField label={m.opportunities_field_remote()} />
          )}
        </form.AppField>
        <form.AppField name="deadline">
          {(field) => (
            <field.TextField
              type="date"
              label={m.opportunities_field_deadline()}
              description={m.opportunities_field_deadline_hint({
                days: OPPORTUNITY_LIMITS.defaultLifetimeDays,
                max: OPPORTUNITY_LIMITS.maxLifetimeDays,
              })}
            />
          )}
        </form.AppField>
        <form.Subscribe selector={(state) => state.values.sourceLocale}>
          {(locale) => (
            <form.Field name="tagIds">
              {(field) => (
                <OpportunityTagField
                  locale={locale}
                  value={field.state.value}
                  onChange={field.handleChange}
                  errors={field.state.meta.errors}
                />
              )}
            </form.Field>
          )}
        </form.Subscribe>
      </FieldGroup>
      <div aria-live="polite">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <form.AppForm>
          <form.SubmitButton>{submitLabel}</form.SubmitButton>
        </form.AppForm>
        <Button type="button" variant="outline" onClick={onCancel}>
          {m.opportunities_action_cancel()}
        </Button>
      </div>
    </form>
  );
}
