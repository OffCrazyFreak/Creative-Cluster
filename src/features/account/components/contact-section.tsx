import { withForm } from "@/components/custom/form/app-form";
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { m } from "@/paraglide/messages";

import { emptyListingValues } from "../listing-defaults";
import VisibilitySelect from "./visibility-select";

const ContactSection = withForm({
  defaultValues: emptyListingValues(),
  render: function Render({ form }) {
    return (
      <FieldSet>
        <FieldLegend>{m.account_section_contact()}</FieldLegend>
        <FieldGroup>
          <form.AppField name="contactName">
            {(field) => (
              <field.TextField
                label={m.account_field_contact_name()}
                autoComplete="name"
              />
            )}
          </form.AppField>
          <VisibilitySelect
            form={form}
            name="visibility.contactName"
            of={m.account_field_contact_name()}
          />
          <form.AppField name="contactEmail">
            {(field) => (
              <field.TextField
                label={m.account_field_contact_email()}
                type="email"
                autoComplete="email"
              />
            )}
          </form.AppField>
          <VisibilitySelect
            form={form}
            name="visibility.contactEmail"
            of={m.account_field_contact_email()}
          />
          <form.AppField name="contactPhone">
            {(field) => (
              <field.TextField
                label={m.account_field_contact_phone()}
                autoComplete="tel"
              />
            )}
          </form.AppField>
          <VisibilitySelect
            form={form}
            name="visibility.contactPhone"
            of={m.account_field_contact_phone()}
          />
        </FieldGroup>
      </FieldSet>
    );
  },
});

export default ContactSection;
