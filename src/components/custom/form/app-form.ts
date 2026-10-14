import { createFormHook } from "@tanstack/react-form";

import { fieldContext, formContext } from "./form-context";
import CheckboxField from "./checkbox-field";
import RichTextField from "./rich-text-field";
import SelectField from "./select-field";
import SubmitButton from "./submit-button";
import TextAreaField from "./text-area-field";
import TextField from "./text-field";

// Shared TanStack Form setup: Zod schemas go in `validators`, fields render shadcn Field parts.
export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextField,
    TextAreaField,
    SelectField,
    CheckboxField,
    RichTextField,
  },
  formComponents: { SubmitButton },
});
