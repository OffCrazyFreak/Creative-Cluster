import type { EmailExpiry } from "@/constants/email";
import type { AppLocale } from "@/constants/locales";
import { m } from "@/paraglide/messages";

export function expiryText(expiry: EmailExpiry, locale: AppLocale): string {
  if (expiry === "hour") return m.email_expiry_hour({}, { locale });
  if (expiry === "days7") return m.email_expiry_days_7({}, { locale });
  return m.email_expiry_days_30({}, { locale });
}
