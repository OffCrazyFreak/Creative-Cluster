import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { m } from "@/paraglide/messages";

import { pendingCountQuery } from "../connections-queries";

// The count is the only nudge besides the one email, so it sits next to the link in /account.
export default function PendingConnectionsLink() {
  const { data: count = 0 } = useQuery(pendingCountQuery());
  return (
    <Link
      to="/account/connections"
      className="inline-flex items-center gap-2 py-2"
    >
      {m.connections_account_link()}
      {count > 0 ? (
        <Badge>
          <span aria-hidden="true">{count}</span>
          <span className="sr-only">
            {m.connections_badge_label({ count })}
          </span>
        </Badge>
      ) : null}
    </Link>
  );
}
