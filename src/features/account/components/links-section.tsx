import { withForm } from "@/components/custom/form/app-form";
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { SOCIAL_LABELS, SOCIAL_PLATFORMS } from "@/constants/account";
import { m } from "@/paraglide/messages";

import { emptyListingValues } from "../listing-defaults";
import VisibilitySelect from "./visibility-select";

const LinksSection = withForm({
  defaultValues: emptyListingValues(),
  render: function Render({ form }) {
    return (
      <FieldSet>
        <FieldLegend>{m.account_section_links()}</FieldLegend>
        <FieldGroup>
          <form.AppField name="website">
            {(field) => <field.TextField label={m.account_field_website()} />}
          </form.AppField>
          <VisibilitySelect
            form={form}
            name="visibility.website"
            of={m.account_field_website()}
          />
          {SOCIAL_PLATFORMS.map((platform) => (
            <form.AppField key={platform} name={`socials.${platform}`}>
              {(field) => <field.TextField label={SOCIAL_LABELS[platform]} />}
            </form.AppField>
          ))}
          <VisibilitySelect
            form={form}
            name="visibility.socials"
            of={m.account_field_socials()}
          />
        </FieldGroup>
      </FieldSet>
    );
  },
});

export default LinksSection;
