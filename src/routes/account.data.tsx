import { createFileRoute } from "@tanstack/react-router";

import AccountDataPage from "@/features/lifecycle/components/account-data-page";
import { ownListingStatusQueryOptions } from "@/features/lifecycle/lifecycle-queries";

export const Route = createFileRoute("/account/data")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(ownListingStatusQueryOptions()),
  component: AccountDataPage,
});
