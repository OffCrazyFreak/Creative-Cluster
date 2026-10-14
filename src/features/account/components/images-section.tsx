import { useStore } from "@tanstack/react-form";

import { withForm } from "@/components/custom/form/app-form";
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import type { EntryKind } from "@/constants/entry";
import type { ImageKind } from "@/constants/images";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { m } from "@/paraglide/messages";

import { emptyListingValues } from "../listing-defaults";
import ListingImageField from "./listing-image-field";

// People have a photo (the logo slot) and no cover.
function imageSlots(kind: EntryKind) {
  const slots: { name: "logo" | "cover"; kind: ImageKind; label: string }[] = [
    {
      name: "logo",
      kind: "logo",
      label:
        kind === "person" ? m.account_field_photo() : m.account_field_logo(),
    },
  ];
  if (kind !== "person") {
    slots.push({
      name: "cover",
      kind: "cover",
      label: m.account_field_cover(),
    });
  }
  return slots;
}

const ImagesSection = withForm({
  defaultValues: emptyListingValues(),
  props: {} as { kind: EntryKind },
  render: function Render({ form, kind }) {
    // The name only seeds the default alt text; settle it before it reaches the (memoised) image fields.
    const name = useStore(form.store, (state) => state.values.name);
    const entryName = useDebouncedValue(name, 500);
    return (
      <FieldSet>
        <FieldLegend>{m.account_section_images()}</FieldLegend>
        <FieldGroup>
          {imageSlots(kind).map((slot) => (
            <form.Field key={slot.name} name={slot.name}>
              {(field) => (
                <ListingImageField
                  id={field.name}
                  kind={slot.kind}
                  label={slot.label}
                  entryName={entryName}
                  value={field.state.value}
                  onChange={field.handleChange}
                  errors={field.state.meta.errors}
                />
              )}
            </form.Field>
          ))}
        </FieldGroup>
      </FieldSet>
    );
  },
});

export default ImagesSection;
