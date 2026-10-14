import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { placeLine } from "@/features/entry/components/entry-location";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import type { IListItem } from "../directory-schemas";
import { tagLabel } from "../tag-label";

interface IDirectoryEntryCardProps {
  item: IListItem;
}

export default function DirectoryEntryCard({ item }: IDirectoryEntryCardProps) {
  const locale = getLocale();
  const place = placeLine({
    city: item.city,
    countryCode: item.country,
    onlineOnly: false,
    addressText: null,
    lat: null,
    lng: null,
    townOnly: true,
  });
  const kind =
    item.kind === "person"
      ? m.entry_kind_person()
      : m.entry_kind_organization();

  return (
    <li className="flex flex-col gap-1">
      <h3 className="font-semibold">
        <Link
          to="/e/$slug"
          params={{ slug: item.slug }}
          className="inline-block py-1"
        >
          {item.name}
        </Link>
      </h3>
      <p className="text-sm">{[kind, place].filter(Boolean).join(" · ")}</p>
      {item.blurb ? <p>{item.blurb}</p> : null}
      {item.tags.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {item.tags.map((tag) => (
            <li key={tag.slug}>
              <Badge variant="secondary">{tagLabel(tag, locale)}</Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
