import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

import { useFieldContext } from "./form-context";

interface ITextAreaFieldProps {
  label: string;
  description?: string;
  rows?: number;
  maxLength?: number;
}

export default function TextAreaField({
  label,
  description,
  rows = 4,
  maxLength,
}: ITextAreaFieldProps) {
  const field = useFieldContext<string>();
  const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const descriptionId = description ? `${field.name}-description` : undefined;

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Textarea
        id={field.name}
        name={field.name}
        rows={rows}
        maxLength={maxLength}
        value={field.state.value}
        aria-invalid={invalid}
        aria-describedby={descriptionId}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
      />
      {description && (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      )}
      {invalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
