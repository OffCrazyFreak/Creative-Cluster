import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { m } from "@/paraglide/messages";

interface IRenewOpportunityFormProps {
  hasDeadline: boolean;
  disabled: boolean;
  onRenew: (deadline?: string) => void;
}

// A post with a deadline ends the day after it, so renewing needs a later date.
export default function RenewOpportunityForm({
  hasDeadline,
  disabled,
  onRenew,
}: IRenewOpportunityFormProps) {
  const [deadline, setDeadline] = useState("");
  const inputId = useId();

  if (!hasDeadline) {
    return (
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => onRenew()}
      >
        {m.opportunities_action_renew()}
      </Button>
    );
  }
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onRenew(deadline);
      }}
    >
      <Field className="w-auto">
        <FieldLabel htmlFor={inputId}>
          {m.opportunities_renew_deadline()}
        </FieldLabel>
        <Input
          id={inputId}
          type="date"
          required
          value={deadline}
          onChange={(event) => setDeadline(event.target.value)}
        />
      </Field>
      <Button type="submit" variant="outline" disabled={disabled}>
        {m.opportunities_action_renew()}
      </Button>
    </form>
  );
}
