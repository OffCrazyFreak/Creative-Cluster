import { createFileRoute } from "@tanstack/react-router";

import { mySummaryQuery } from "@/features/account/account-queries";
import AccountHomePage from "@/features/account/components/account-home-page";
import { loginOnUnauthorized } from "@/features/session/login-on-unauthorized";

export const Route = createFileRoute("/account/")({
  loader: ({ context, location }) =>
    loginOnUnauthorized({ context, location }, () =>
      context.queryClient.ensureQueryData(mySummaryQuery()),
    ),
  component: AccountHomePage,
});
