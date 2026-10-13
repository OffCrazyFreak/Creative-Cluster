import { Badge } from "@/components/ui/badge";
import type { AppLocale } from "@/constants/locales";
import { getLocale } from "@/paraglide/runtime";

import { tagLabel } from "../tag-label";
import type { ITagOption } from "../tag-schemas";

export interface ITagBadgeListProps {
  tags: readonly ITagOption[];
  locale?: AppLocale;
}

export default function TagBadgeList({
  tags,
  locale = getLocale(),
}: ITagBadgeListProps) {
  return (
    <ul className="flex flex-wrap gap-1">
      {tags.map((option) => (
        <li key={option.id}>
          <Badge variant="secondary">{tagLabel(option, locale)}</Badge>
        </li>
      ))}
    </ul>
  );
}
