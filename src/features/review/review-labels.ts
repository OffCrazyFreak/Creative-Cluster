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
  return TYPE_LABELS[type]({}, { locale });
}

export function reasonLabel(code: ReasonCode): string {
  return REASON_LABELS[code]();
}

export function reportReasonLabel(
  reason: ReportReason,
  locale?: AppLocale,
): string {
  return REPORT_REASON_LABELS[reason]({}, { locale });
}

// Stored payloads are untyped JSON; an unknown value is shown as is rather than dropped.
export function storedReasonLabel(
  reason: unknown,
  locale?: AppLocale,
): string | null {
  if (typeof reason !== "string" || !reason) return null;
  return REPORT_REASONS.includes(reason as ReportReason)
    ? reportReasonLabel(reason as ReportReason, locale)
    : reason;
}

export function reviewAgeLabel(days: number, locale?: AppLocale): string {
  return days <= 0
    ? m.review_age_today({}, { locale })
    : m.review_age_days({ count: days }, { locale });
}
