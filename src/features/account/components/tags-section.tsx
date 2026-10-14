import { useStore } from "@tanstack/react-form";

import { withForm } from "@/components/custom/form/app-form";
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { TAG_FIELDS, type TagField } from "@/constants/tags";
import { m } from "@/paraglide/messages";

import { emptyListingValues } from "../listing-defaults";
import ListingTagField from "./listing-tag-field";

const LABELS: Record<TagField, () => string> = {
  topic: m.account_field_tags_topic,
  offering: m.account_field_tags_offering,
  seeking: m.account_field_tags_seeking,
};

const TagsSection = withForm({
  defaultValues: emptyListingValues(),
  render: function Render({ form }) {
    // New tag suggestions are written in the language of the listing's own texts.
    const locale = useStore(form.store, (state) => state.values.sourceLocale);
    return (
      <FieldSet>
        <FieldLegend>{m.account_section_tags()}</FieldLegend>
        <FieldGroup>
          {TAG_FIELDS.map((tagField) => (
            <form.Field key={tagField} name={`tags.${tagField}`}>
              {(field) => (
                <ListingTagField
                  id={field.name}
                  label={LABELS[tagField]()}
                  locale={locale}
                  value={field.state.value}
                  onChange={field.handleChange}
                />
              )}
            </form.Field>
          ))}
        </FieldGroup>
      </FieldSet>
    );
  },
});

export default TagsSection;
