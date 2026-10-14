import { IMPORT_ARCHIVE_MONTHS } from "@/constants/lifecycle";
import { LOCALES, type AppLocale } from "@/constants/locales";
import type { IClaimEmailProps } from "@/emails/email-types";
import { site } from "@/sites";

import { claimTokenFor } from "./claim-token.server";

export interface IClaimEmailSource {
  inviteId: string;
  name: string;
  sourceLocale: string;
  importedAt: Date;
}

export function claimEmailLocale(value: string): AppLocale {
  return LOCALES.find((locale) => locale === value) ?? site.baseLocale;
}

// Same rule as the daily archive check (SQL months arithmetic clamps month ends, setUTCMonth rolls over), in UTC.
// A date already past (an old import) becomes today: the archive job runs within a day.
function archiveDateText(importedAt: Date, locale: AppLocale): string {
  const date = new Date(importedAt);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + IMPORT_ARCHIVE_MONTHS);
  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  const shown = date.getTime() < Date.now() ? new Date() : date;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(shown);
}

export function claimEmailProps(
  source: IClaimEmailSource,
  importSource: string,
): IClaimEmailProps {
  const locale = claimEmailLocale(source.sourceLocale);
  const link = `${site.origin}/claim/${claimTokenFor(source.inviteId)}`;
  return {
    locale,
    entryName: source.name,
    link,
    removeLink: `${link}/remove`,
    expiry: "days30",
    importSource,
    archiveDate: archiveDateText(source.importedAt, locale),
  };
}
