import { getLocale } from "@/paraglide/runtime";

const formatters = new Map<string, Intl.DateTimeFormat>();

// UTC on both server and browser, so a date near midnight cannot differ between the two renders.
export function formatMediumDate(iso: string): string {
  const locale = getLocale();
  let formatter = formatters.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeZone: "UTC",
    });
    formatters.set(locale, formatter);
  }
  return formatter.format(new Date(iso));
}
