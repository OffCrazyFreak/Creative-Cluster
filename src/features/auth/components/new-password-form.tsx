import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { useAppForm } from "@/components/custom/form/app-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { authClient } from "@/lib/auth/auth-client";
import { m } from "@/paraglide/messages";

import { safeAuthCall } from "../safe-auth-call";
import { newPasswordSchema } from "../auth-schemas";
import FormError from "./form-error";
import NewPasswordField from "./new-password-field";

interface INewPasswordFormProps {
  token: string;
  mode: "reset" | "invite";
}

export default function NewPasswordForm({
  token,
  mode,
}: INewPasswordFormProps) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useAppForm({
    defaultValues: { newPassword: "", confirm: "" },
    validators: { onChange: newPasswordSchema },
    onSubmit: async ({ value }) => {
      setError(null);
      const message = await safeAuthCall(() =>
        authClient.resetPassword({ newPassword: value.newPassword, token }),
      );
      setError(message);
      setDone(!message);
    },
  });

  if (done) {
    return (
      <Alert role="status">
        <AlertTitle>
          {mode === "invite"
            ? m.auth_set_done_title()
            : m.auth_reset_done_title()}
        </AlertTitle>
        <AlertDescription className="flex flex-col gap-4">
          {mode === "invite" ? m.auth_set_done() : m.auth_reset_done()}
          <Link to="/login" className={buttonVariants()}>
            {m.auth_login_submit()}
          </Link>
        </AlertDescription>
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
        <form.AppField name="newPassword">
          {() => <NewPasswordField />}
        </form.AppField>
        <form.AppField name="confirm">
          {(field) => (
            <field.TextField
              label={m.auth_password_confirm()}
              type="password"
              autoComplete="new-password"
            />
          )}
        </form.AppField>
      </FieldGroup>
      <FormError message={error} />
      <form.AppForm>
        <form.SubmitButton>
          {mode === "invite" ? m.auth_set_submit() : m.auth_reset_new_submit()}
        </form.SubmitButton>
      </form.AppForm>
    </form>
  );
}
