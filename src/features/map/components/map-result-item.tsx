import { Link } from "@tanstack/react-router";
import { memo, useContext } from "react";

import { Badge } from "@/components/ui/badge";
import { countryName } from "@/features/directory/country-name";
import type {
  IDirectoryEntry,
  IDirectoryTag,
} from "@/features/directory/directory-schemas";
import { tagLabel } from "@/features/directory/tag-label";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { SetHoveredSlugContext } from "../map-frame-context";

interface IMapResultItemProps {
  entry: IDirectoryEntry;
  tags: IDirectoryTag[];
}

const MAX_TAGS = 3;

function MapResultItem({ entry, tags }: IMapResultItemProps) {
  const setHoveredSlug = useContext(SetHoveredSlugContext);
  const locale = getLocale();
  const kind =
    entry.kind === "person"
      ? m.entry_kind_person()
      : m.entry_kind_organization();
  const place = [
    entry.city,
    entry.country ? countryName(entry.country, locale) : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <li
      className="flex flex-col gap-1"
      onMouseEnter={() => setHoveredSlug(entry.slug)}
      onMouseLeave={() => setHoveredSlug(null)}
      onFocus={() => setHoveredSlug(entry.slug)}
      onBlur={() => setHoveredSlug(null)}
    >
      <h3 className="font-semibold">
        <Link
          to="/e/$slug"
          params={{ slug: entry.slug }}
          className="inline-block py-1"
        >
          {entry.name}
        </Link>
      </h3>
      <p className="text-sm">{[kind, place].filter(Boolean).join(" · ")}</p>
      {entry.blurb ? <p className="text-sm">{entry.blurb}</p> : null}
      {entry.tags.length > 0 ? (
        <ul className="flex flex-wrap gap-1">
          {entry.tags.slice(0, MAX_TAGS).map((index) => (
            <li key={tags[index].slug}>
              <Badge variant="secondary">
                {tagLabel(
                  { labelEn: tags[index].en, labelHr: tags[index].hr },
                  locale,
                )}
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default memo(MapResultItem);
