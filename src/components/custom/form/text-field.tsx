import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { useFieldContext } from "./form-context";

interface ITextFieldProps {
  label: string;
  type?: "text" | "email" | "password";
  autoComplete?: string;
  description?: string;
  onFocus?: () => void;
}

export default function TextField({
  label,
  type = "text",
  autoComplete,
  description,
  onFocus,
}: ITextFieldProps) {
  const field = useFieldContext<string>();
  const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const descriptionId = description ? `${field.name}-description` : undefined;
  const errorId = invalid ? `${field.name}-error` : undefined;
  const describedBy =
    [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        id={field.name}
        name={field.name}
        type={type}
        autoComplete={autoComplete}
        value={field.state.value}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        onFocus={onFocus}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
      />
      {description && (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      )}
      {invalid && <FieldError id={errorId} errors={field.state.meta.errors} />}
    </Field>
  );
}
