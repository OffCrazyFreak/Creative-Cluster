import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { buttonVariants } from "@/components/ui/button";
import ListingStatusPanel from "@/features/lifecycle/components/listing-status-panel";
import { m } from "@/paraglide/messages";

import { mySummaryQuery } from "../account-queries";
import ErasureNotice from "./erasure-notice";
import ListingSummary from "./listing-summary";
import SuspensionNotice from "./suspension-notice";

// Other account areas add their pieces inside the marked sections: notices on top (apply and review
// outcomes), listing actions under the summary (archive, confirm up to date), and data and erasure at the end.
// An empty slot hides itself, so it adds no gap.
export default function AccountHomePage() {
  const { data: summary } = useSuspenseQuery(mySummaryQuery());
  const erasing = Boolean(summary?.erasureRequestedAt);

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-8">
      <h1 className="text-2xl font-semibold">{m.account_home_title()}</h1>
      <div
        data-slot="account-notices"
        className="flex flex-col gap-4 empty:hidden"
      >
        {summary?.erasureRequestedAt && (
          <ErasureNotice requestedAt={summary.erasureRequestedAt} />
        )}
        {summary?.status === "suspended" && !erasing && (
          <SuspensionNotice reason={summary.suspendedReason} />
        )}
      </div>
      {summary && !erasing ? (
        <div
          data-slot="account-listing"
          className="flex flex-col gap-4 empty:hidden"
        >
          <ListingSummary listing={summary} />
          <ListingStatusPanel />
        </div>
      ) : (
        !summary && <p>{m.account_home_no_listing()}</p>
      )}
      {!erasing && (
        <nav
          aria-label={m.account_home_links_label()}
          className="flex flex-wrap gap-2"
        >
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
      )}
      <div
        data-slot="account-data"
        className="flex flex-col gap-4 empty:hidden"
      />
    </section>
  );
}
