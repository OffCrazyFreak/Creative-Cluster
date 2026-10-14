import { createFileRoute } from "@tanstack/react-router";

import MyOpportunitiesPage from "@/features/opportunities/components/my-opportunities-page";
import { myOpportunitiesQuery } from "@/features/opportunities/opportunity-queries";
import { pickerTagsQuery } from "@/features/tags/tag-queries";

export const Route = createFileRoute("/account/opportunities")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(myOpportunitiesQuery()),
      context.queryClient.ensureQueryData(pickerTagsQuery()),
    ]);
  },
  component: MyOpportunitiesPage,
});
