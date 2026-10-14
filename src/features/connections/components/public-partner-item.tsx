import { Link } from "@tanstack/react-router";

import { m } from "@/paraglide/messages";

import type { IPublicRelation } from "../connections-schemas";
import { relationDetails } from "../relation-details";
import { relationLabel } from "../relation-label";

interface IPublicPartnerItemProps {
  relation: IPublicRelation;
  name: string;
  // Confirmed partners link to their page; outside partners link to their own website.
  slug?: string;
  website?: string | null;
  evidence?: string[];
}

export default function PublicPartnerItem({
  relation,
  name,
  slug,
  website,
  evidence = [],
}: IPublicPartnerItemProps) {
  const details = relationDetails(relation);
  return (
    <li className="flex flex-col gap-1">
      <span className="flex flex-wrap gap-x-2">
        <span>{relationLabel(relation.kind, relation.direction)}</span>
        {slug ? (
          <Link to="/e/$slug" params={{ slug }} className="font-medium">
            {name}
          </Link>
        ) : website ? (
          <a
            href={website}
            rel="noopener noreferrer nofollow"
            className="font-medium"
          >
            {name}
          </a>
        ) : (
          <span className="font-medium">{name}</span>
        )}
      </span>
      {details ? <span className="text-sm">{details}</span> : null}
      {evidence.map((url) => (
        <a
          key={url}
          href={url}
          rel="noopener noreferrer nofollow"
          className="text-sm break-all"
        >
          {m.connections_evidence()}: {url}
        </a>
      ))}
    </li>
  );
}
