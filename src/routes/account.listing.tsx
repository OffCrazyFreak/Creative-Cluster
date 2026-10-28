import { createFileRoute } from "@tanstack/react-router";

import { myListingQuery } from "@/features/account/account-queries";
import ListingPage from "@/features/account/components/listing-page";
import { loginOnUnauthorized } from "@/features/session/login-on-unauthorized";
import { pickerTagsQuery } from "@/features/tags/tag-queries";

export const Route = createFileRoute("/account/listing")({
  loader: async ({ context, location }) => {
    await loginOnUnauthorized({ context, location }, () =>
      Promise.all([
        context.queryClient.ensureQueryData(myListingQuery()),
        context.queryClient.ensureQueryData(pickerTagsQuery()),
      ]),
    );
  },
  component: ListingPage,
});
