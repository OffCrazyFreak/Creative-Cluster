import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { countryName } from "@/features/directory/country-name";
import EntryImage from "@/features/images/components/entry-image";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { formatDate } from "@/utils/format-date";

import type { IPublicOpportunity } from "../opportunity-list-schemas";
import { categoryLabel, typeLabel } from "../opportunity-labels";

interface IOpportunityListItemProps {
  item: IPublicOpportunity;
}

const LOGO_SIZE = 40;

export default function OpportunityListItem({
  item,
}: IOpportunityListItemProps) {
  const { entry } = item;
  const place = [
    entry.city,
    entry.country ? countryName(entry.country, getLocale()) : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <li className="flex gap-3">
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
        <h3 className="font-semibold">
          <Link
            to="/opportunities/$id"
            params={{ id: item.id }}
            lang={item.titleLang}
            className="inline-block py-1"
          >
            {item.title}
          </Link>
        </h3>
        <ul className="flex flex-wrap gap-1">
          {item.filled ? (
            <li>
              <Badge>{m.opportunities_item_filled()}</Badge>
            </li>
          ) : null}
          <li>
            <Badge variant="outline">{typeLabel(item.type)}</Badge>
          </li>
          <li>
            <Badge variant="outline">{categoryLabel(item.category)}</Badge>
          </li>
          {item.remoteOk ? (
            <li>
              <Badge variant="outline">{m.opportunities_item_remote()}</Badge>
            </li>
          ) : null}
        </ul>
        <p className="text-sm">
          <Link to="/e/$slug" params={{ slug: entry.slug }}>
            {m.opportunities_item_by({ name: entry.name })}
          </Link>
          {place ? ` · ${place}` : null}
        </p>
        {item.snippet ? (
          <p className="text-sm" lang={item.snippetLang}>
            {item.snippet}
          </p>
        ) : null}
        {!item.filled ? (
          <p className="text-sm">
            {item.deadline
              ? m.opportunities_item_closes({ date: formatDate(item.deadline) })
              : m.opportunities_item_open_until({
                  date: formatDate(item.expiresAt),
                })}
          </p>
        ) : null}
      </div>
    </li>
  );
}
