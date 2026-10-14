import { withForm } from "@/components/custom/form/app-form";
import { FieldLegend, FieldSet } from "@/components/ui/field";
import { m } from "@/paraglide/messages";

import { emptyApplication } from "../apply-defaults";

export const ContactSection = withForm({
  defaultValues: emptyApplication(),
  render: function Render({ form }) {
    return (
      <FieldSet>
        <FieldLegend>{m.apply_section_contact()}</FieldLegend>
        <form.AppField name="contactEmail">
          {(field) => (
            <field.TextField
              label={m.apply_contact_email()}
              type="email"
              autoComplete="email"
              description={m.apply_contact_email_hint()}
            />
          )}
        </form.AppField>
        <form.AppField name="contactName">
          {(field) => (
            <field.TextField
              label={m.apply_contact_name()}
              autoComplete="name"
            />
          )}
        </form.AppField>
        <form.AppField name="contactPhone">
          {(field) => (
            <field.TextField
              label={m.apply_contact_phone()}
              autoComplete="tel"
            />
          )}
        </form.AppField>
        <form.AppField name="website">
          {(field) => (
            <field.TextField label={m.apply_website()} autoComplete="url" />
          )}
        </form.AppField>
      </FieldSet>
    );
  },
});
