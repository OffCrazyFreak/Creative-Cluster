import type { AppLocale } from "@/constants/locales";
import { tagLabel } from "@/features/tags/tag-label";
import { m } from "@/paraglide/messages";

import type { IMatchPerspective, IMatchReason } from "../matching-schemas";

interface IMatchReasonLineProps {
  reason: IMatchReason;
  locale: AppLocale;
  perspective: IMatchPerspective;
}

export default function MatchReasonLine({
  reason,
  locale,
  perspective: { entryName, viewerOwns },
}: IMatchReasonLineProps) {
  const tags = new Intl.ListFormat(locale, { type: "conjunction" }).format(
    reason.tags.map((tag) => tagLabel(tag, locale)),
  );
  if (reason.relation === "offers")
    return (
      <p>
        {viewerOwns
          ? m.matching_reason_offers({ tags })
          : m.matching_reason_offers_entry({ tags, name: entryName })}
      </p>
    );
  if (reason.relation === "seeks")
    return (
      <p>
        {viewerOwns
          ? m.matching_reason_seeks({ tags })
          : m.matching_reason_seeks_entry({ tags, name: entryName })}
      </p>
    );
  return <p>{m.matching_reason_topic({ tags })}</p>;
}
