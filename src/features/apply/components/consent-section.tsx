import type { ReactNode } from "react";

import { FieldLegend, FieldSet } from "@/components/ui/field";
import { m } from "@/paraglide/messages";

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
