import type { ReactNode } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { m } from "@/paraglide/messages";

interface IConsentBoxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  onBlur: () => void;
  invalid: boolean;
  message: string;
  children: ReactNode;
}

export function ConsentBox({
  id,
  checked,
  onChange,
  onBlur,
  invalid,
  message,
  children,
}: IConsentBoxProps) {
  return (
    <Field
      orientation="horizontal"
      className="items-start"
      data-invalid={invalid}
    >
      <Checkbox
        id={id}
        name={id}
        checked={checked}
        aria-invalid={invalid}
        onCheckedChange={onChange}
        onBlur={onBlur}
      />
      <div className="flex flex-col gap-1">
        <FieldLabel htmlFor={id}>{children}</FieldLabel>
        {invalid && <FieldError>{message}</FieldError>}
      </div>
    </Field>
  );
}

interface IConsentSectionProps {
  children: ReactNode;
}

export default function ConsentSection({ children }: IConsentSectionProps) {
  return (
    <FieldSet>
      <FieldLegend>{m.apply_section_consent()}</FieldLegend>
      {children}
    </FieldSet>
  );
}
