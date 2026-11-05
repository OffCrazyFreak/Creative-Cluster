import type { AppLocale } from "@/constants/locales";
import { getLocale } from "@/paraglide/runtime";

// UTC on purpose: server and browser sit in different time zones, and a differing date breaks hydration.
export function formatDate(
  value: string | Date,
  locale: AppLocale = getLocale(),
): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}
