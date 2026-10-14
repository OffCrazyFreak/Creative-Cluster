import { useId } from "react";

import { withForm } from "@/components/custom/form/app-form";
import { m } from "@/paraglide/messages";

import { emptyProposeValues } from "../propose-form-schema";
import TargetSearch from "./target-search";

// Either a search over the directory or the name and website of a partner who is not in it.
const ProposeTargetFields = withForm({
  defaultValues: emptyProposeValues(""),
  render: function Render({ form }) {
    const searchId = useId();
    return (
      <>
        <form.AppField name="outside">
          {(field) => (
            <field.CheckboxField label={m.connections_field_outside()} />
          )}
        </form.AppField>
        <form.Subscribe selector={(state) => state.values.outside}>
          {(outside) => (
            <>
              {/* Both groups stay mounted: TanStack Form only shows submit errors on fields that existed at submit time. */}
              <div className={outside ? "contents" : "hidden"}>
                <form.AppField name="outsideName">
                  {(field) => (
                    <field.TextField
                      label={m.connections_field_outside_name()}
                    />
                  )}
                </form.AppField>
                <form.AppField name="outsideWebsite">
                  {(field) => (
                    <field.TextField
                      label={m.connections_field_outside_website()}
                    />
                  )}
                </form.AppField>
              </div>
              <div className={outside ? "hidden" : "contents"}>
                <form.Field name="targetId">
                  {(field) => (
                    <form.Subscribe
                      selector={(state) => state.values.targetName}
                    >
                      {(targetName) => (
                        <TargetSearch
                          id={searchId}
                          selectedName={targetName}
                          errors={
                            field.state.meta.isTouched
                              ? field.state.meta.errors
                              : undefined
                          }
                          onClear={() => {
                            field.handleChange("");
                            form.setFieldValue("targetName", "");
                          }}
                          onPick={(target) => {
                            field.handleChange(target.id);
                            form.setFieldValue("targetName", target.name);
                          }}
                        />
                      )}
                    </form.Subscribe>
                  )}
                </form.Field>
              </div>
            </>
          )}
        </form.Subscribe>
      </>
    );
  },
});

export default ProposeTargetFields;
