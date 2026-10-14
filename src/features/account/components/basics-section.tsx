import { withForm } from "@/components/custom/form/app-form";
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { LISTING_LIMITS } from "@/constants/account";
import { LOCALE_NAMES, LOCALES } from "@/constants/locales";
import { m } from "@/paraglide/messages";

import { emptyListingValues } from "../listing-defaults";

const BasicsSection = withForm({
  defaultValues: emptyListingValues(),
  render: function Render({ form }) {
    return (
      <FieldSet>
        <FieldLegend>{m.account_section_basics()}</FieldLegend>
        <FieldGroup>
          <form.AppField name="name">
            {(field) => <field.TextField label={m.account_field_name()} />}
          </form.AppField>
          <form.AppField name="sourceLocale">
            {(field) => (
              <field.SelectField
                label={m.account_field_source_locale()}
                options={LOCALES.map((value) => ({
                  value,
                  label: LOCALE_NAMES[value],
                }))}
              />
            )}
          </form.AppField>
          <form.Subscribe selector={(state) => state.values.sourceLocale}>
            {(locale) => (
              <form.AppField name="description">
                {(field) => (
                  <field.RichTextField
                    label={m.account_field_description()}
                    maxChars={LISTING_LIMITS.description}
                    lang={locale}
                  />
                )}
              </form.AppField>
            )}
          </form.Subscribe>
          <form.AppField name="offeringText">
            {(field) => (
              <field.TextAreaField
                label={m.account_field_offering()}
                maxLength={LISTING_LIMITS.offering}
              />
            )}
          </form.AppField>
          <form.AppField name="seekingText">
            {(field) => (
              <field.TextAreaField
                label={m.account_field_seeking()}
                maxLength={LISTING_LIMITS.seeking}
              />
            )}
          </form.AppField>
        </FieldGroup>
      </FieldSet>
    );
  },
});

export default BasicsSection;
