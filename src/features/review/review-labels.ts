import type { AppLocale } from "@/constants/locales";
import type { ReasonCode, ReviewType } from "@/constants/moderation";
import { REPORT_REASONS, type ReportReason } from "@/constants/review";
import { m } from "@/paraglide/messages";

const TYPE_LABELS = {
  application: m.review_type_application,
  untrusted_edit: m.review_type_untrusted_edit,
  opportunity: m.review_type_opportunity,
  tag: m.review_type_tag,
  report: m.review_type_report,
  link_dispute: m.review_type_link_dispute,
} satisfies Record<ReviewType, typeof m.review_type_tag>;

const REASON_LABELS: Record<ReasonCode, () => string> = {
  incomplete: () => m.review_reason_incomplete(),
  duplicate: () => m.review_reason_duplicate(),
  out_of_scope: () => m.review_reason_out_of_scope(),
  unverifiable: () => m.review_reason_unverifiable(),
  spam: () => m.review_reason_spam(),
  other: () => m.review_reason_other(),
};

const REPORT_REASON_LABELS = {
  inaccurate: m.review_report_reason_inaccurate,
  spam: m.review_report_reason_spam,
  offensive: m.review_report_reason_offensive,
  illegal: m.review_report_reason_illegal,
  other: m.review_report_reason_other,
} satisfies Record<ReportReason, typeof m.review_report_reason_other>;

export function reviewTypeLabel(type: ReviewType, locale?: AppLocale): string {
  return TYPE_LABELS[type]({}, locale ? { locale } : undefined);
}

export function reasonLabel(code: ReasonCode): string {
  return REASON_LABELS[code]();
}

// Stored payloads are untyped JSON, so an unknown value yields no label instead of a raw code.
export function reportReasonLabel(
  reason: unknown,
  locale?: AppLocale,
): string | null {
  if (!REPORT_REASONS.includes(reason as ReportReason)) return null;
  return REPORT_REASON_LABELS[reason as ReportReason](
    {},
    locale ? { locale } : undefined,
  );
}

export function reviewAgeLabel(days: number, locale?: AppLocale): string {
  const options = locale ? { locale } : undefined;
  return days <= 0
    ? m.review_age_today({}, options)
    : m.review_age_days({ count: days }, options);
}
