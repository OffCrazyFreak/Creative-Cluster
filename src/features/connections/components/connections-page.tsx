import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";

import { m } from "@/paraglide/messages";

import {
  myConnectionsQuery,
  unclaimedProposalsQuery,
} from "../connections-queries";
import ConnectionSection from "./connection-section";

export default function ConnectionsPage() {
  const { viewer } = useRouteContext({ from: "__root__" });
  const isAdmin = viewer?.role === "admin";
  const { data } = useSuspenseQuery(myConnectionsQuery());
  const unclaimed = useQuery({
    ...unclaimedProposalsQuery(),
    enabled: isAdmin,
  });
  const { entries, items } = data;
  const showSelf = entries.length > 1;
  const proposals = items.filter((item) => item.status === "proposed");

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-8">
      <h1 className="text-2xl font-semibold">{m.connections_title()}</h1>
      <p>{m.connections_intro()}</p>
      {entries.length === 0 ? <p>{m.connections_no_listing()}</p> : null}
      <ConnectionSection
        title={m.connections_section_waiting()}
        items={proposals.filter((item) => item.role === "recipient")}
        showSelf={showSelf}
      />
      <ConnectionSection
        title={m.connections_section_sent()}
        items={proposals.filter((item) => item.role === "proposer")}
        showSelf={showSelf}
      />
      <ConnectionSection
        title={m.connections_section_confirmed()}
        items={items.filter((item) => item.status === "confirmed")}
        showSelf={showSelf}
      />
      {items.length === 0 ? <p>{m.connections_empty()}</p> : null}
      <ConnectionSection
        title={m.connections_section_unclaimed()}
        description={m.connections_unclaimed_hint()}
        items={unclaimed.data ?? []}
        showSelf
        onBehalf
      />
    </section>
  );
}
