import { m } from "@/paraglide/messages";

const LABELS: Record<string, () => string> = {
  sourceLocale: () => m.admin_entries_field_sourceLocale(),
  website: () => m.admin_entries_field_website(),
  socials: () => m.admin_entries_field_socials(),
  description: () => m.admin_entries_field_description(),
  offering: () => m.admin_entries_field_offering(),
  seeking: () => m.admin_entries_field_seeking(),
  contactName: () => m.admin_entries_field_contactName(),
  contactEmail: () => m.admin_entries_field_contactEmail(),
  contactPhone: () => m.admin_entries_field_contactPhone(),
  contactEmailInvalid: () => m.admin_entries_field_contactEmailInvalid(),
  trusted: () => m.admin_entries_field_trusted(),
  matchingOptOut: () => m.admin_entries_field_matchingOptOut(),
  onlineOnly: () => m.admin_entries_field_onlineOnly(),
  addressText: () => m.admin_entries_field_addressText(),
  city: () => m.admin_entries_field_city(),
  countryCode: () => m.admin_entries_field_countryCode(),
  lat: () => m.admin_entries_field_lat(),
  lng: () => m.admin_entries_field_lng(),
  precision: () => m.admin_entries_field_precision(),
  locationSource: () => m.admin_entries_field_locationSource(),
  pinMovedByHand: () => m.admin_entries_field_pinMovedByHand(),
  locationDisplay: () => m.admin_entries_field_locationDisplay(),
  visibility: () => m.admin_entries_field_visibility(),
  extra: () => m.admin_entries_field_extra(),
  hasLogo: () => m.admin_entries_field_hasLogo(),
  hasCover: () => m.admin_entries_field_hasCover(),
  consentAt: () => m.admin_entries_field_consentAt(),
  consentVersion: () => m.admin_entries_field_consentVersion(),
  suspendedReason: () => m.admin_entries_field_suspendedReason(),
  createdAt: () => m.admin_entries_field_createdAt(),
  updatedAt: () => m.admin_entries_field_updatedAt(),
  publishedAt: () => m.admin_entries_field_publishedAt(),
  lastConfirmedAt: () => m.admin_entries_field_lastConfirmedAt(),
  importedAt: () => m.admin_entries_field_importedAt(),
  erasureRequestedAt: () => m.admin_entries_field_erasureRequestedAt(),
};

export function fieldLabel(key: string): string {
  return LABELS[key]?.() ?? key;
}
