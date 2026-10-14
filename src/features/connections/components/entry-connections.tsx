import { useQuery } from "@tanstack/react-query";
import { useId } from "react";

import { m } from "@/paraglide/messages";

import { publicConnectionsQuery } from "../connections-queries";
import PublicPartnerItem from "./public-partner-item";

interface IEntryConnectionsProps {
  entryId: string;
}

// Renders nothing while loading, on error or without connections, like the matching cards beside it.
export default function EntryConnections({ entryId }: IEntryConnectionsProps) {
  const headingId = useId();
  const unverifiedId = useId();
  const listId = `entry-connections-${entryId}`;
  const { data } = useQuery(publicConnectionsQuery(entryId));
  if (!data || (data.partners.length === 0 && data.unverified.length === 0))
    return null;

  return (
    <>
      {data.partners.length > 0 ? (
        <section aria-labelledby={headingId} className="flex flex-col gap-3">
          <h2 id={headingId} className="text-lg font-semibold">
            {m.connections_public_heading()}
          </h2>
          <ul id={listId} className="flex flex-col gap-2">
            {data.partners.map((partner) => (
              <PublicPartnerItem
                key={partner.linkId}
                relation={partner}
                name={partner.name}
                slug={partner.slug}
              />
            ))}
          </ul>
        </section>
      ) : null}
      {data.unverified.length > 0 ? (
        <section aria-labelledby={unverifiedId} className="flex flex-col gap-3">
          <h2 id={unverifiedId} className="text-lg font-semibold">
            {m.connections_unverified_heading()}
          </h2>
          <p>{m.connections_unverified_hint()}</p>
          <ul className="flex flex-col gap-2">
            {data.unverified.map((partner) => (
              <PublicPartnerItem
                key={partner.linkId}
                relation={partner}
                name={partner.name}
                website={partner.website}
                evidence={partner.evidence}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
