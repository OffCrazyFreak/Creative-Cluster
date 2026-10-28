import { createFileRoute } from "@tanstack/react-router";

import AccountDataPage from "@/features/lifecycle/components/account-data-page";
import {
  erasureStateQueryOptions,
  ownListingStatusQueryOptions,
} from "@/features/lifecycle/lifecycle-queries";
import { loginOnUnauthorized } from "@/features/session/login-on-unauthorized";

export const Route = createFileRoute("/account/data")({
  loader: ({ context, location }) =>
    loginOnUnauthorized({ context, location }, () =>
      Promise.all([
        context.queryClient.ensureQueryData(ownListingStatusQueryOptions()),
        context.queryClient.ensureQueryData(erasureStateQueryOptions()),
      ]),
    ),
  component: AccountDataPage,
});
