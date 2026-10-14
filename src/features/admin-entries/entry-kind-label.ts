import type { EntryKind } from "@/constants/entry";
import type { AppLocale } from "@/constants/locales";
import { m } from "@/paraglide/messages";

const LABELS = {
  organization: m.entry_kind_organization,
  person: m.entry_kind_person,
  outside_partner: m.entry_kind_outside_partner,
} satisfies Record<EntryKind, typeof m.entry_kind_person>;

// Emails render outside a request, so the locale is passed in; pages use the current locale.
export function kindLabel(kind: EntryKind, locale?: AppLocale): string {
  return LABELS[kind]({}, { locale });
}
