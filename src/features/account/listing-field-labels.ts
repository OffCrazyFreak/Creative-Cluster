import { SOCIAL_LABELS, SOCIAL_PLATFORMS } from "@/constants/account";
import { m } from "@/paraglide/messages";

// Names the error summary uses for form field paths.
export function fieldLabel(name: string): string {
  const platform = SOCIAL_PLATFORMS.find((p) => name === `socials.${p}`);
  if (platform) return SOCIAL_LABELS[platform];
  const labels: Record<string, () => string> = {
    name: m.account_field_name,
    sourceLocale: m.account_field_source_locale,
    description: m.account_field_description,
    offeringText: m.account_field_offering,
    seekingText: m.account_field_seeking,
    website: m.account_field_website,
    contactName: m.account_field_contact_name,
    contactEmail: m.account_field_contact_email,
    contactPhone: m.account_field_contact_phone,
    location: m.account_field_location,
    "tags.topic": m.account_field_tags_topic,
    "tags.offering": m.account_field_tags_offering,
    "tags.seeking": m.account_field_tags_seeking,
    logo: m.account_field_logo,
    cover: m.account_field_cover,
    legalStatus: m.account_field_legal_status,
    references: m.account_field_references,
  };
  return labels[name]?.() ?? name;
}

// Moves keyboard focus to the control of a field; custom fields mark their wrapper with data-field.
export function focusField(name: string) {
  const wrapper = document.querySelector(`[data-field="${CSS.escape(name)}"]`);
  // The editing area comes before the toolbar buttons in DOM order only by accident, so ask for it first.
  const target =
    document.getElementById(name) ??
    wrapper?.querySelector<HTMLElement>("[role=textbox], input, textarea") ??
    wrapper?.querySelector<HTMLElement>("select, button, [tabindex]");
  target?.focus();
}
