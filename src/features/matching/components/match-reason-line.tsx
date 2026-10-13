import type { AppLocale } from "@/constants/locales";
import { tagLabel } from "@/features/tags/tag-label";
import { m } from "@/paraglide/messages";

import type { IMatchReason } from "../matching-schemas";

interface IMatchReasonLineProps {
  reason: IMatchReason;
  locale: AppLocale;
}

export default function MatchReasonLine({
  reason,
  locale,
}: IMatchReasonLineProps) {
  const tags = new Intl.ListFormat(locale, { type: "conjunction" }).format(
    reason.tags.map((tag) => tagLabel(tag, locale)),
  );
  if (reason.relation === "offers")
    return <p>{m.matching_reason_offers({ tags })}</p>;
  if (reason.relation === "seeks")
    return <p>{m.matching_reason_seeks({ tags })}</p>;
  return <p>{m.matching_reason_topic({ tags })}</p>;
}
