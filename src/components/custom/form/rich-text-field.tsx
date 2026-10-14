import RichTextEditor from "@/components/custom/rich-text/rich-text-editor";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { m } from "@/paraglide/messages";
import type { IFormRichText, RichTextDoc } from "@/typings/rich-text";

import { errorMessage } from "./error-message";
import { useFieldContext } from "./form-context";

interface IRichTextFieldProps {
  label: string;
  maxChars: number;
  lang?: string;
  description?: string;
}

const REASON_CODES: readonly string[] = [
  "invalid",
  "too_large",
  "too_deep",
  "too_many_nodes",
  "too_many_links",
  "bad_link",
  "bad_tags",
];

// richTextInput reports a reason code; show a message for it, and pass real messages through.
function messageOf(error: unknown, maxChars: number): string {
  const text = errorMessage(error) ?? "";
  if (text === "too_long") return m.account_error_too_long({ max: maxChars });
  return REASON_CODES.includes(text) ? m.account_error_rich_text() : text;
}

export default function RichTextField({
  label,
  maxChars,
  lang,
  description,
}: IRichTextFieldProps) {
  const field = useFieldContext<IFormRichText>();
  const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const errors = field.state.meta.errors.map((error) => ({
    message: messageOf(error, maxChars),
  }));

  return (
    <Field data-invalid={invalid} data-field={field.name}>
      <FieldLabel id={`${field.name}-label`}>{label}</FieldLabel>
      <RichTextEditor
        value={field.state.value as RichTextDoc}
        onChange={(doc) => field.handleChange(doc)}
        onBlur={field.handleBlur}
        maxChars={maxChars}
        label={label}
        lang={lang}
        invalid={invalid}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      {invalid && <FieldError errors={errors} />}
    </Field>
  );
}
