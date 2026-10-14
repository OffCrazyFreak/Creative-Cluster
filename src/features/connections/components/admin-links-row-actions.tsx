import { m } from "@/paraglide/messages";

import type { IAdminLinkRow } from "../admin-links-schemas";
import { decideUnclaimedProposal } from "../connections.functions";
import { useConnectionAction } from "../hooks/use-connection-action";
import DecideButtons from "./decide-buttons";

interface IAdminLinksRowActionsProps {
  row: IAdminLinkRow;
}

// Admins decide only for a listing nobody owns; otherwise the owner (or the proposer, by withdrawing) acts.
export default function AdminLinksRowActions({
  row,
}: IAdminLinksRowActionsProps) {
  const { run, busy } = useConnectionAction();
  if (!row.canDecide) {
    return <span>{m.admin_links_owner_decides()}</span>;
  }
  return (
    <DecideButtons
      name={row.proposer.name}
      busy={busy}
      onDecide={(decision) =>
        void run(
          () =>
            decideUnclaimedProposal({
              data: { linkId: row.id, decision },
            }),
          decision === "confirm"
            ? m.connections_done_confirm()
            : m.connections_done_reject(),
        )
      }
    />
  );
}
