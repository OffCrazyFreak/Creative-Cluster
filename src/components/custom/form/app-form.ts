import { createFormHook } from "@tanstack/react-form";

import { fieldContext, formContext } from "./form-context";
import SelectField from "./select-field";
import SubmitButton from "./submit-button";
import TextField from "./text-field";

// Shared TanStack Form setup: Zod schemas go in `validators`, fields render shadcn Field parts.
export const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: { TextField, SelectField },
  formComponents: { SubmitButton },
});
