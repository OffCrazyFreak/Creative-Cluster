import { withForm } from "@/components/custom/form/app-form";
import RichTextEditor from "@/components/custom/rich-text/rich-text-editor";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { APPLY_DESCRIPTION_MAX_CHARS } from "@/constants/apply";
import type { RichTextDoc } from "@/typings/rich-text";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { applicantKinds, emptyApplication } from "../apply-defaults";
import DuplicateHint from "./duplicate-hint";

export const AboutSection = withForm({
  defaultValues: emptyApplication(),
  render: function Render({ form }) {
    const kinds = applicantKinds();
    return (
      <>
        {kinds.length > 1 && (
          <FieldSet>
            <FieldLegend>{m.apply_section_kind()}</FieldLegend>
            <form.AppField name="kind">
              {(field) => (
                <field.SelectField
                  label={m.apply_kind_label()}
                  options={kinds.map((kind) => ({
                    value: kind,
                    label:
                      kind === "person"
                        ? m.apply_kind_person()
                        : m.apply_kind_organization(),
                  }))}
                />
              )}
            </form.AppField>
          </FieldSet>
        )}
        <FieldSet>
          <FieldLegend>{m.apply_section_about()}</FieldLegend>
          <form.AppField name="name">
            {(field) => (
              <field.TextField label={m.apply_name()} autoComplete="off" />
            )}
          </form.AppField>
          <form.Subscribe selector={(state) => state.values.name}>
            {(name) => <DuplicateHint name={name} />}
          </form.Subscribe>
          <form.Field name="description">
            {(field) => {
              const invalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={invalid}>
                  <FieldLabel>{m.apply_description()}</FieldLabel>
                  <RichTextEditor
                    value={field.state.value as RichTextDoc}
                    onChange={field.handleChange}
                    onBlur={field.handleBlur}
                    maxChars={APPLY_DESCRIPTION_MAX_CHARS}
                    label={m.apply_description()}
                    invalid={invalid}
                    lang={getLocale()}
                  />
                  <FieldDescription>
                    {m.apply_description_hint()}
                  </FieldDescription>
                  {invalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>
        </FieldSet>
      </>
    );
  },
});
