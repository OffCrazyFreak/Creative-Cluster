import { withForm } from "@/components/custom/form/app-form";
import { m } from "@/paraglide/messages";

import { LINK_DIRECTIONS } from "../connections-schemas";
import { emptyProposeValues } from "../propose-form-schema";
import { isDirectedKind, roleLabel } from "../relation-label";

// Only directed kinds (member of, supplier, mentor) need to say which side the proposer is on.
const ProposeDirectionField = withForm({
  defaultValues: emptyProposeValues(""),
  render: function Render({ form }) {
    return (
      <form.Subscribe selector={(state) => state.values.kind}>
        {(kind) =>
          isDirectedKind(kind) ? (
            <form.AppField name="direction">
              {(field) => (
                <field.SelectField
                  label={m.connections_field_direction()}
                  options={LINK_DIRECTIONS.map((direction) => ({
                    value: direction,
                    label: roleLabel(kind, direction),
                  }))}
                />
              )}
            </form.AppField>
          ) : null
        }
      </form.Subscribe>
    );
  },
});

export default ProposeDirectionField;
