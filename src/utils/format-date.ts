import { getLocale } from "@/paraglide/runtime";

// UTC on purpose: the server and the browser sit in different time zones, and a date that differs between
// them breaks hydration.
export function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat(getLocale(), {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}
