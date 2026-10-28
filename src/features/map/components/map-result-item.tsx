import { Link } from "@tanstack/react-router";
import { memo, useContext } from "react";

import { Badge } from "@/components/ui/badge";
import { countryName } from "@/features/directory/country-name";
import type {
  IDirectoryEntry,
  IDirectoryTag,
} from "@/features/directory/directory-schemas";
import EntryImage from "@/features/images/components/entry-image";
import { tagLabel } from "@/features/directory/tag-label";
import SaveEntryButton from "@/features/saved/components/save-entry-button";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { SetHoveredSlugContext } from "../map-frame-context";

interface IMapResultItemProps {
  entry: IDirectoryEntry;
  tags: IDirectoryTag[];
  // Under an "on the map" or "elsewhere" heading, so one level deeper.
  nested?: boolean;
  // From the visitor's position, when it is precise enough to show.
  distance?: string | null;
}

const MAX_TAGS = 3;
const LOGO_SIZE = 40;

function MapResultItem({ entry, tags, nested, distance }: IMapResultItemProps) {
  const Heading = nested ? "h4" : "h3";
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
      className="flex gap-3"
      onMouseEnter={() => setHoveredSlug(entry.slug)}
      onMouseLeave={() => setHoveredSlug(null)}
      onFocus={() => setHoveredSlug(entry.slug)}
      onBlur={() => setHoveredSlug(null)}
    >
      {entry.logo ? (
        <EntryImage
          image={entry.logo}
          alt=""
          width={LOGO_SIZE}
          height={LOGO_SIZE}
          className="size-10 shrink-0 object-contain"
        />
      ) : null}
      <div className="flex min-w-0 flex-col gap-1">
        <Heading className="font-semibold">
          <Link
            to="/e/$slug"
            params={{ slug: entry.slug }}
            className="inline-block py-1"
          >
            {entry.name}
          </Link>
        </Heading>
        <p className="text-sm">
          {[kind, place, distance].filter(Boolean).join(" · ")}
          <SaveEntryButton entry={{ slug: entry.slug, name: entry.name }} />
        </p>
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
      </div>
    </li>
  );
}

export default memo(MapResultItem);
