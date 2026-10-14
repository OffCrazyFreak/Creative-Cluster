import { createFileRoute } from "@tanstack/react-router";

import AccountDataPage from "@/features/lifecycle/components/account-data-page";
import {
  erasureStateQueryOptions,
  ownListingStatusQueryOptions,
} from "@/features/lifecycle/lifecycle-queries";

export const Route = createFileRoute("/account/data")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(ownListingStatusQueryOptions()),
      context.queryClient.ensureQueryData(erasureStateQueryOptions()),
    ]),
  component: AccountDataPage,
});
