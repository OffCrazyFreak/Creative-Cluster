import type { ReasonCode, ReviewType } from "@/constants/moderation";
import { m } from "@/paraglide/messages";

const TYPE_LABELS: Record<ReviewType, () => string> = {
  application: () => m.review_type_application(),
  untrusted_edit: () => m.review_type_untrusted_edit(),
  opportunity: () => m.review_type_opportunity(),
  tag: () => m.review_type_tag(),
  report: () => m.review_type_report(),
  link_dispute: () => m.review_type_link_dispute(),
};

const REASON_LABELS: Record<ReasonCode, () => string> = {
  incomplete: () => m.review_reason_incomplete(),
  duplicate: () => m.review_reason_duplicate(),
  out_of_scope: () => m.review_reason_out_of_scope(),
  unverifiable: () => m.review_reason_unverifiable(),
  spam: () => m.review_reason_spam(),
  other: () => m.review_reason_other(),
};

export function reviewTypeLabel(type: ReviewType): string {
  return TYPE_LABELS[type]();
}

export function reasonLabel(code: ReasonCode): string {
  return REASON_LABELS[code]();
}
