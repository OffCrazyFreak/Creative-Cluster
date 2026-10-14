import { withForm } from "@/components/custom/form/app-form";
import { FIELD_VISIBILITIES } from "@/constants/entry";
import { m } from "@/paraglide/messages";

import { emptyListingValues } from "../listing-defaults";

type VisibilityName =
  | "visibility.website"
  | "visibility.socials"
  | "visibility.contactName"
  | "visibility.contactEmail"
  | "visibility.contactPhone"
  | "visibility.address";

function labelOf(level: (typeof FIELD_VISIBILITIES)[number]) {
  if (level === "public") return m.account_visibility_public();
  if (level === "members") return m.account_visibility_members();
  return m.account_visibility_hidden();
}

// One select per private field, shown right under the field it protects.
const VisibilitySelect = withForm({
  defaultValues: emptyListingValues(),
  props: {} as { name: VisibilityName; of: string },
  render: function Render({ form, name, of }) {
    return (
      <form.AppField name={name}>
        {(field) => (
          <field.SelectField
            label={m.account_visibility_label({ field: of })}
            options={FIELD_VISIBILITIES.map((level) => ({
              value: level,
              label: labelOf(level),
            }))}
          />
        )}
      </form.AppField>
    );
  },
});

export default VisibilitySelect;
