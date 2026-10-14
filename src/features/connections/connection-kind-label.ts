import type { LinkKind } from "@/constants/links";
import type { AppLocale } from "@/constants/locales";
import { m } from "@/paraglide/messages";

const LABELS = {
  collaborated: m.connections_kind_collaborated,
  eu_partner: m.connections_kind_eu_partner,
  member_of: m.connections_kind_member_of,
  supplier: m.connections_kind_supplier,
  mentor: m.connections_kind_mentor,
} satisfies Record<LinkKind, typeof m.connections_kind_mentor>;

// Emails render outside a request, so the locale is passed in; pages use the current locale.
export function kindLabel(kind: LinkKind, locale?: AppLocale): string {
  return LABELS[kind]({}, locale ? { locale } : undefined);
}
