import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { buttonVariants } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

import { myListingQuery } from "../account-queries";
import ListingSummary from "./listing-summary";
import SuspensionNotice from "./suspension-notice";

// Other account areas add their pieces inside the marked sections: notices on top (apply and review
// outcomes), listing actions under the summary (archive, confirm up to date), and data and erasure at the end.
export default function AccountHomePage() {
  const { data: listing } = useSuspenseQuery(myListingQuery());

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-8">
      <h1 className="text-2xl font-semibold">{m.account_home_title()}</h1>
      <div data-slot="account-notices" className="flex flex-col gap-4">
        {listing?.status === "suspended" && (
          <SuspensionNotice reason={listing.suspendedReason} />
        )}
      </div>
      {listing ? (
        <div data-slot="account-listing" className="flex flex-col gap-4">
          <ListingSummary listing={listing} />
        </div>
      ) : (
        <p>{m.account_home_no_listing()}</p>
      )}
      <nav aria-label={m.account_home_title()} className="flex flex-wrap gap-2">
        <Link
          to="/account/opportunities"
          className={buttonVariants({ variant: "outline" })}
        >
          {m.account_home_opportunities()}
        </Link>
        <Link
          to="/account/connections"
          className={buttonVariants({ variant: "outline" })}
        >
          {m.account_home_connections()}
        </Link>
      </nav>
      <div data-slot="account-data" className="flex flex-col gap-4" />
    </section>
  );
}
