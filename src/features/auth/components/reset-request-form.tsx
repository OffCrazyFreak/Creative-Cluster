import { useState } from "react";

import { useAppForm } from "@/components/custom/form/app-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FieldGroup } from "@/components/ui/field";
import { authClient } from "@/lib/auth/auth-client";
import { m } from "@/paraglide/messages";

import { authErrorMessage } from "../auth-errors";
import { resetRequestSchema } from "../auth-schemas";
import FormError from "./form-error";

export default function ResetRequestForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useAppForm({
    defaultValues: { email: "" },
    validators: { onChange: resetRequestSchema },
    onSubmit: async ({ value }) => {
      setError(null);
      const result = await authClient.requestPasswordReset({
        email: value.email,
      });
      if (result.error) setError(authErrorMessage(result.error));
      else setSent(true);
    },
  });

  if (sent) {
    return (
      <Alert role="status">
        <AlertDescription>{m.auth_reset_sent()}</AlertDescription>
      </Alert>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.AppField name="email">
          {(field) => (
            <field.TextField
              label={m.auth_login_email()}
              type="email"
              autoComplete="email"
            />
          )}
        </form.AppField>
      </FieldGroup>
      <FormError message={error} />
      <form.AppForm>
        <form.SubmitButton>{m.auth_reset_submit()}</form.SubmitButton>
      </form.AppForm>
    </form>
  );
}
