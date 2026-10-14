import TextField from "@/components/custom/form/text-field";
import { useFieldContext } from "@/components/custom/form/form-context";
import { m } from "@/paraglide/messages";

import { usePasswordStrength } from "../hooks/use-password-strength";
import PasswordStrength from "./password-strength";

export default function NewPasswordField() {
  const field = useFieldContext<string>();
  const strength = usePasswordStrength(field.state.value);

  return (
    <>
      <TextField
        label={m.auth_password_new()}
        type="password"
        autoComplete="new-password"
        description={m.auth_password_hint()}
        onFocus={strength.load}
      />
      <PasswordStrength score={strength.score} />
    </>
  );
}
