import { withForm } from "@/components/custom/form/app-form";
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { LISTING_LIMITS } from "@/constants/account";
import type { EntryKind } from "@/constants/entry";
import { m } from "@/paraglide/messages";

import { emptyListingValues } from "../listing-defaults";
import { hasLegalStatus } from "../listing-rules";

// References show on both sites; legal status follows hasLegalStatus.
const DetailsSection = withForm({
  defaultValues: emptyListingValues(),
  props: {} as { kind: EntryKind },
  render: function Render({ form, kind }) {
    return (
      <FieldSet>
        <FieldLegend>{m.account_section_details()}</FieldLegend>
        <FieldGroup>
          {hasLegalStatus(kind) && (
            <form.AppField name="legalStatus">
              {(field) => (
                <field.TextField
                  label={m.account_field_legal_status()}
                  description={m.account_field_legal_status_hint()}
                />
              )}
            </form.AppField>
          )}
          <form.Subscribe selector={(state) => state.values.sourceLocale}>
            {(locale) => (
              <form.AppField name="references">
                {(field) => (
                  <field.RichTextField
                    label={m.account_field_references()}
                    maxChars={LISTING_LIMITS.references}
                    lang={locale}
                  />
                )}
              </form.AppField>
            )}
          </form.Subscribe>
          <form.AppField name="matchingOptOut">
            {(field) => (
              <field.CheckboxField
                label={m.account_field_matching()}
                description={m.account_field_matching_hint()}
              />
            )}
          </form.AppField>
        </FieldGroup>
      </FieldSet>
    );
  },
});

export default DetailsSection;
