import { withForm } from "@/components/custom/form/app-form";
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import type { EntryKind } from "@/constants/entry";
import { m } from "@/paraglide/messages";

import { emptyListingValues } from "../listing-defaults";
import ListingImageField from "./listing-image-field";

const ImagesSection = withForm({
  defaultValues: emptyListingValues(),
  props: {} as { kind: EntryKind },
  render: function Render({ form, kind }) {
    return (
      <FieldSet>
        <FieldLegend>{m.account_section_images()}</FieldLegend>
        <FieldGroup>
          <form.Subscribe selector={(state) => state.values.name}>
            {(name) => (
              <>
                <form.Field name="logo">
                  {(field) => (
                    <ListingImageField
                      id={field.name}
                      kind="logo"
                      label={
                        kind === "person"
                          ? m.account_field_photo()
                          : m.account_field_logo()
                      }
                      entryName={name}
                      value={field.state.value}
                      onChange={field.handleChange}
                    />
                  )}
                </form.Field>
                {kind !== "person" && (
                  <form.Field name="cover">
                    {(field) => (
                      <ListingImageField
                        id={field.name}
                        kind="cover"
                        label={m.account_field_cover()}
                        entryName={name}
                        value={field.state.value}
                        onChange={field.handleChange}
                      />
                    )}
                  </form.Field>
                )}
              </>
            )}
          </form.Subscribe>
        </FieldGroup>
      </FieldSet>
    );
  },
});

export default ImagesSection;
