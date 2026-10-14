import { useState } from "react";

import { useAppForm } from "@/components/custom/form/app-form";
import { FieldGroup } from "@/components/ui/field";
import { authClient } from "@/lib/auth/auth-client";
import { m } from "@/paraglide/messages";

import { loginSchema } from "../auth-schemas";
import { useRefreshViewer } from "../hooks/use-refresh-viewer";
import { safeAuthCall } from "../safe-auth-call";
import FormError from "./form-error";

export default function LoginForm() {
  const refreshViewer = useRefreshViewer();
  const [error, setError] = useState<string | null>(null);

  const form = useAppForm({
    defaultValues: { email: "", password: "" },
    validators: { onChange: loginSchema },
    onSubmit: async ({ value }) => {
      setError(null);
      const message = await safeAuthCall(() => authClient.signIn.email(value));
      setError(message);
      // The /login route redirects a logged-in viewer to the page they came from.
      if (!message) await refreshViewer();
    },
  });

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
              autoComplete="username"
            />
          )}
        </form.AppField>
        <form.AppField name="password">
          {(field) => (
            <field.TextField
              label={m.auth_login_password()}
              type="password"
              autoComplete="current-password"
            />
          )}
        </form.AppField>
      </FieldGroup>
      <FormError message={error} />
      <form.AppForm>
        <form.SubmitButton>{m.auth_login_submit()}</form.SubmitButton>
      </form.AppForm>
    </form>
  );
}
