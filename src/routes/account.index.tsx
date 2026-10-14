import { createFileRoute, redirect } from "@tanstack/react-router";

import { mySummaryQuery } from "@/features/account/account-queries";
import AccountHomePage from "@/features/account/components/account-home-page";
import { isUnauthorized } from "@/features/account/is-unauthorized";
import { VIEWER_QUERY_KEY } from "@/features/session/session-queries";

export const Route = createFileRoute("/account/")({
  // The cached viewer can outlive its session; the guard then says so and the visitor goes to log in.
  loader: async ({ context, location }) => {
    try {
      await context.queryClient.ensureQueryData(mySummaryQuery());
    } catch (error) {
      if (!isUnauthorized(error)) throw error;
      context.queryClient.setQueryData(VIEWER_QUERY_KEY, null);
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  component: AccountHomePage,
});
