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

// Unclaimed imports are archived a fixed time after import, and the mail says when.
function archiveDateText(importedAt: Date, locale: AppLocale): string {
  const date = new Date(importedAt);
  date.setMonth(date.getMonth() + IMPORT_ARCHIVE_MONTHS);
  return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(date);
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
