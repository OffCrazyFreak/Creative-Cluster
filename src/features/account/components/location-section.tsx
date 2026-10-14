import { withForm } from "@/components/custom/form/app-form";
import { errorMessage } from "@/components/custom/form/error-message";
import {
  Field,
  FieldError,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import type { EntryKind } from "@/constants/entry";
import { AddressField, PinPicker, TownPicker } from "@/features/location";
import { m } from "@/paraglide/messages";

import { DEFAULT_COUNTRY, emptyListingValues } from "../listing-defaults";
import VisibilitySelect from "./visibility-select";

const ERROR_ID = "location-error";

const LocationSection = withForm({
  defaultValues: emptyListingValues(),
  props: {} as { kind: EntryKind },
  render: function Render({ form, kind }) {
    return (
      <FieldSet>
        <FieldLegend>{m.account_section_location()}</FieldLegend>
        <form.Field name="location">
          {(field) => {
            const invalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            const aria = {
              invalid,
              describedBy: invalid ? ERROR_ID : undefined,
            };
            return (
              <Field data-invalid={invalid} data-field={field.name}>
                {kind === "person" ? (
                  <TownPicker
                    value={field.state.value}
                    onChange={field.handleChange}
                    defaultCountryCode={DEFAULT_COUNTRY}
                    {...aria}
                  />
                ) : (
                  <>
                    <AddressField
                      value={field.state.value}
                      onChange={field.handleChange}
                      defaultCountryCode={DEFAULT_COUNTRY}
                      {...aria}
                    />
                    {!field.state.value.onlineOnly && (
                      <PinPicker
                        value={field.state.value}
                        onChange={field.handleChange}
                      />
                    )}
                  </>
                )}
                {invalid && (
                  <FieldError
                    id={ERROR_ID}
                    errors={field.state.meta.errors.map((error) => ({
                      message: errorMessage(error),
                    }))}
                  />
                )}
              </Field>
            );
          }}
        </form.Field>
        {kind !== "person" && (
          <VisibilitySelect
            form={form}
            name="visibility.address"
            of={m.account_field_address()}
          />
        )}
      </FieldSet>
    );
  },
});

export default LocationSection;
