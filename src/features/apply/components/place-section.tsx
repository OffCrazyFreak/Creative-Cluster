import { withForm } from "@/components/custom/form/app-form";
import {
  Field,
  FieldError,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { AddressField, TownPicker } from "@/features/location";
import { m } from "@/paraglide/messages";

import { defaultCountry, emptyApplication } from "../apply-defaults";

// People pick a town only; organizations search an address. Switching kind drops the other's value.
export const PlaceSection = withForm({
  defaultValues: emptyApplication(),
  render: function Render({ form }) {
    return (
      <FieldSet>
        <FieldLegend>{m.apply_section_place()}</FieldLegend>
        <form.Subscribe selector={(state) => state.values.kind}>
          {(kind) => (
            <form.Subscribe selector={(state) => state.submissionAttempts}>
              {(attempts) => (
                <form.Field name="location">
                  {(field) => {
                    // The pickers have no blur, so the error waits for a send attempt.
                    const invalid =
                      attempts > 0 &&
                      !(
                        field.state.value.countryCode && field.state.value.city
                      );
                    const props = {
                      value: field.state.value,
                      onChange: field.handleChange,
                      defaultCountryCode: defaultCountry(),
                    };
                    return (
                      <Field data-invalid={invalid}>
                        {kind === "person" ? (
                          <TownPicker key="person" {...props} />
                        ) : (
                          <AddressField key="organization" {...props} />
                        )}
                        {invalid && (
                          <FieldError>{m.apply_location_required()}</FieldError>
                        )}
                      </Field>
                    );
                  }}
                </form.Field>
              )}
            </form.Subscribe>
          )}
        </form.Subscribe>
        <p className="text-sm">{m.apply_tags_note()}</p>
      </FieldSet>
    );
  },
});
