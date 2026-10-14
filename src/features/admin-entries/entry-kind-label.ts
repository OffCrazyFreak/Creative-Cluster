import type { EntryKind } from "@/constants/entry";
import { m } from "@/paraglide/messages";

const LABELS: Record<EntryKind, () => string> = {
  organization: () => m.entry_kind_organization(),
  person: () => m.entry_kind_person(),
  outside_partner: () => m.entry_kind_outside_partner(),
};

export function kindLabel(kind: EntryKind): string {
  return LABELS[kind]();
}
