import { withForm } from "@/components/custom/form/app-form";
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { m } from "@/paraglide/messages";

import { emptyListingValues } from "../listing-defaults";
import ListingTagField from "./listing-tag-field";

const TagsSection = withForm({
  defaultValues: emptyListingValues(),
  render: function Render({ form }) {
    return (
      <FieldSet>
        <FieldLegend>{m.account_section_tags()}</FieldLegend>
        <FieldGroup>
          <form.Field name="tags.topic">
            {(field) => (
              <ListingTagField
                id={field.name}
                label={m.account_field_tags_topic()}
                value={field.state.value}
                onChange={field.handleChange}
              />
            )}
          </form.Field>
          <form.Field name="tags.offering">
            {(field) => (
              <ListingTagField
                id={field.name}
                label={m.account_field_tags_offering()}
                value={field.state.value}
                onChange={field.handleChange}
              />
            )}
          </form.Field>
          <form.Field name="tags.seeking">
            {(field) => (
              <ListingTagField
                id={field.name}
                label={m.account_field_tags_seeking()}
                value={field.state.value}
                onChange={field.handleChange}
              />
            )}
          </form.Field>
        </FieldGroup>
      </FieldSet>
    );
  },
});

export default TagsSection;
