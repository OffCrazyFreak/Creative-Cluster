import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useFieldContext } from "./form-context";

interface ISelectOption {
  value: string;
  label: string;
}

interface ISelectFieldProps {
  label: string;
  options: ISelectOption[];
}

export default function SelectField({ label, options }: ISelectFieldProps) {
  const field = useFieldContext<string>();
  const invalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Select
        items={options}
        value={field.state.value}
        onValueChange={(value) => field.handleChange(value ?? "")}
      >
        <SelectTrigger id={field.name} aria-invalid={invalid}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {invalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
