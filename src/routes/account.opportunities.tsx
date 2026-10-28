import { createFileRoute } from "@tanstack/react-router";

import MyOpportunitiesPage from "@/features/opportunities/components/my-opportunities-page";
import { myOpportunitiesQuery } from "@/features/opportunities/opportunity-queries";
import { loginOnUnauthorized } from "@/features/session/login-on-unauthorized";
import { pickerTagsQuery } from "@/features/tags/tag-queries";

export const Route = createFileRoute("/account/opportunities")({
  loader: ({ context, location }) =>
    loginOnUnauthorized({ context, location }, () =>
      Promise.all([
        context.queryClient.ensureQueryData(myOpportunitiesQuery()),
        context.queryClient.ensureQueryData(pickerTagsQuery()),
      ]),
    ),
  component: MyOpportunitiesPage,
});
