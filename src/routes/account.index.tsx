import { createFileRoute } from "@tanstack/react-router";

import { myListingQuery } from "@/features/account/account-queries";
import AccountHomePage from "@/features/account/components/account-home-page";

export const Route = createFileRoute("/account/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(myListingQuery()),
  component: AccountHomePage,
});
