import type { AppLocale } from "@/constants/locales";
import { getLocale } from "@/paraglide/runtime";

// UTC on purpose: the server and the browser sit in different time zones, and a date that differs between
// them breaks hydration.
// Code outside a request (jobs, emails) passes the locale; pages use the request's.
export function formatDate(
  value: string | Date,
  locale: AppLocale = getLocale(),
): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}
