import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { m } from "@/paraglide/messages";

import { myOpportunitiesQuery } from "../opportunity-queries";

// Shown on /account: no email goes out in v1, so this is the only reminder before a post ends.
export default function ExpiringSoonNotice() {
  const { data } = useQuery(myOpportunitiesQuery());
  const count =
    data?.items.filter((item) => item.state === "expiring_soon").length ?? 0;
  if (count === 0) return null;
  return (
    <Alert>
      <AlertDescription className="flex flex-wrap gap-x-2">
        <span>{m.opportunities_expiring_notice({ count })}</span>
        <Link to="/account/opportunities">
          {m.opportunities_expiring_link()}
        </Link>
      </AlertDescription>
    </Alert>
  );
}
