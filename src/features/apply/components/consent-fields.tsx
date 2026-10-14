import { withForm } from "@/components/custom/form/app-form";
import { m } from "@/paraglide/messages";

import { emptyApplication } from "../apply-defaults";
import ConsentSection, { ConsentBox } from "./consent-section";

// Shown for people only; the stored consent version is CONSENT_TEXT_VERSION, bumped with this wording.
export const ConsentFields = withForm({
  defaultValues: emptyApplication(),
  render: function Render({ form }) {
    return (
      <form.Subscribe selector={(state) => state.values.kind}>
        {(kind) =>
          kind === "person" && (
            <ConsentSection>
              <form.Subscribe selector={(state) => state.submissionAttempts}>
                {(attempts) => (
                  <>
                    <form.Field name="consent">
                      {(field) => (
                        <ConsentBox
                          id="apply-consent"
                          checked={field.state.value}
                          onChange={field.handleChange}
                          onBlur={field.handleBlur}
                          invalid={attempts > 0 && !field.state.value}
                          message={m.apply_consent_required()}
                        >
                          {m.apply_consent_text()}
                        </ConsentBox>
                      )}
                    </form.Field>
                    <form.Field name="ageConfirmed">
                      {(field) => (
                        <ConsentBox
                          id="apply-age"
                          checked={field.state.value}
                          onChange={field.handleChange}
                          onBlur={field.handleBlur}
                          invalid={attempts > 0 && !field.state.value}
                          message={m.apply_age_required()}
                        >
                          {m.apply_age_text()}
                        </ConsentBox>
                      )}
                    </form.Field>
                  </>
                )}
              </form.Subscribe>
            </ConsentSection>
          )
        }
      </form.Subscribe>
    );
  },
});
