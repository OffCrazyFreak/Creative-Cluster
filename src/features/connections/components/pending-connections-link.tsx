import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { m } from "@/paraglide/messages";

import { pendingCountQuery } from "../connections-queries";

// The count is the only nudge besides the one email, so it sits next to the link in /account.
interface IPendingConnectionsLinkProps {
  className?: string;
}

export default function PendingConnectionsLink({
  className,
}: IPendingConnectionsLinkProps) {
  const { data: count = 0 } = useQuery(pendingCountQuery());
  return (
    <Link to="/account/connections" className={className}>
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
