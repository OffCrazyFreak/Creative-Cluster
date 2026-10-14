import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Item, ItemActions, ItemContent } from "@/components/ui/item";
import { m } from "@/paraglide/messages";

import type { IConnectionItem } from "../connections-schemas";
import { formatMediumDate } from "../format-date";
import { relationLabel } from "../relation-label";
import ConnectionActions from "./connection-actions";

interface IConnectionItemProps {
  item: IConnectionItem;
  // Show which of the viewer's listings the connection belongs to (owners of several listings).
  showSelf: boolean;
  onBehalf?: boolean;
}

function yearsText(item: IConnectionItem): string | null {
  if (item.year === null) return null;
  return item.endYear === null
    ? m.connections_years_since({ start: item.year })
    : m.connections_years_range({ start: item.year, end: item.endYear });
}

export default function ConnectionItem({
  item,
  showSelf,
  onBehalf = false,
}: IConnectionItemProps) {
  const { other } = item;
  const outside = other.kind === "outside_partner";
  const details = [yearsText(item), item.project].filter(Boolean).join(" · ");
  const waiting = item.status === "proposed";

  return (
    <Item variant="outline" render={<li />}>
      <ItemContent>
        <div className="flex flex-wrap items-center gap-2">
          <span>{relationLabel(item.kind, item.direction)}</span>
          {outside ? (
            <a
              href={other.website ?? undefined}
              rel="noopener noreferrer nofollow"
              className="font-medium"
            >
              {other.name}
            </a>
          ) : (
            <Link
              to="/e/$slug"
              params={{ slug: other.slug }}
              className="font-medium"
            >
              {other.name}
            </Link>
          )}
          {outside ? (
            <Badge variant="outline">{m.connections_unverified()}</Badge>
          ) : null}
        </div>
        {showSelf ? (
          <p className="text-sm">
            {onBehalf
              ? m.connections_unclaimed_listing({ name: item.self.name })
              : m.connections_your_listing({ name: item.self.name })}
          </p>
        ) : null}
        {details ? <p className="text-sm">{details}</p> : null}
        {item.note ? <p className="text-sm">{item.note}</p> : null}
        {item.evidence.length > 0 ? (
          <div className="flex flex-col text-sm">
            <span>{m.connections_evidence()}</span>
            {item.evidence.map((url) => (
              <a
                key={url}
                href={url}
                rel="noopener noreferrer nofollow"
                className="break-all"
              >
                {url}
              </a>
            ))}
          </div>
        ) : null}
        {waiting ? (
          <p className="text-sm">
            {item.role === "recipient"
              ? m.connections_proposed_by({ name: other.name })
              : m.connections_proposed_to({ name: other.name })}
            {" · "}
            {m.connections_expires({
              date: formatMediumDate(item.expiresAt),
            })}
          </p>
        ) : null}
        {waiting && item.role === "proposer" && other.unclaimed ? (
          <p className="text-sm">{m.connections_unclaimed_note()}</p>
        ) : null}
      </ItemContent>
      <ItemActions>
        <ConnectionActions item={item} onBehalf={onBehalf} />
      </ItemActions>
    </Item>
  );
}
