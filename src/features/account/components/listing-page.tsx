import { useSuspenseQuery } from "@tanstack/react-query";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { m } from "@/paraglide/messages";

import { myListingQuery } from "../account-queries";
import ListingForm from "./listing-form";

export default function ListingPage() {
  const { data: listing } = useSuspenseQuery(myListingQuery());

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-8">
      <h1 className="text-2xl font-semibold">{m.account_listing_title()}</h1>
      {listing ? (
        <>
          <p>{m.account_listing_intro()}</p>
          {listing.hasPendingEdit && (
            <Alert>
              <AlertDescription>
                {m.account_listing_pending_notice()}
              </AlertDescription>
            </Alert>
          )}
          <ListingForm key={listing.id} listing={listing} />
        </>
      ) : (
        <p>{m.account_listing_none()}</p>
      )}
    </section>
  );
}
