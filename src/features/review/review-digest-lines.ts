import type { AppLocale } from "@/constants/locales";
import type { IDigestItem } from "@/emails/email-types";
import { kindLabel } from "@/features/admin-entries/entry-kind-label";
import { BOUNCE_SOURCE } from "@/features/contact/bounce-events.server";
import { m } from "@/paraglide/messages";

import type { recentItems } from "./review-digest.server";
import {
  reviewAgeLabel,
  reviewTypeLabel,
  storedReasonLabel,
} from "./review-labels";

type DigestRow = Awaited<ReturnType<typeof recentItems>>[number];

export const DAY_MS = 86_400_000;

export function ageDays(createdAt: Date, now: Date): number {
  return Math.floor((now.getTime() - createdAt.getTime()) / DAY_MS);
}

function joinDetail(parts: (string | null)[]) {
  return parts.filter(Boolean).join(", ");
}

export function applicationLines(
  rows: DigestRow[],
  now: Date,
  locale: AppLocale,
): IDigestItem[] {
  return rows.map((row) => {
    const days = ageDays(row.createdAt, now);
    return {
      name: row.name,
      detail: joinDetail([
        row.kind && kindLabel(row.kind, locale),
        row.countryCode,
        reviewAgeLabel(days, locale),
      ]),
      ageDays: days,
    };
  });
}

export function reportLines(
  rows: DigestRow[],
  now: Date,
  locale: AppLocale,
): IDigestItem[] {
  return rows.map((row) => {
    const days = ageDays(row.createdAt, now);
    // The automatic bounce report carries a fixed "other" reason; name what happened instead.
    const reason =
      row.payload.source === BOUNCE_SOURCE
        ? m.review_report_bounced({}, { locale })
        : storedReasonLabel(row.payload.reason, locale);
    return {
      name: row.name,
      detail: joinDetail([
        row.entityType === "opportunity"
          ? reviewTypeLabel("opportunity", locale)
          : null,
        reason,
        reviewAgeLabel(days, locale),
      ]),
      ageDays: days,
    };
  });
}
