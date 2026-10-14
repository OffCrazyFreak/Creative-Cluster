import { createFileRoute, redirect } from "@tanstack/react-router";

import { isUnauthorized } from "@/features/account/is-unauthorized";
import MyOpportunitiesPage from "@/features/opportunities/components/my-opportunities-page";
import { myOpportunitiesQuery } from "@/features/opportunities/opportunity-queries";
import { VIEWER_QUERY_KEY } from "@/features/session/session-queries";
import { pickerTagsQuery } from "@/features/tags/tag-queries";

export const Route = createFileRoute("/account/opportunities")({
  // The cached viewer can outlive its session; the guard then says so and the visitor goes to log in.
  loader: async ({ context, location }) => {
    try {
      await Promise.all([
        context.queryClient.ensureQueryData(myOpportunitiesQuery()),
        context.queryClient.ensureQueryData(pickerTagsQuery()),
      ]);
    } catch (error) {
      if (!isUnauthorized(error)) throw error;
      context.queryClient.setQueryData(VIEWER_QUERY_KEY, null);
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  component: MyOpportunitiesPage,
});
