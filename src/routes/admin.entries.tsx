import { createFileRoute, stripSearchParams } from "@tanstack/react-router";

import { adminEntriesQueryOptions } from "@/features/admin-entries/admin-entries-queries";
import { adminEntriesSearchSchema } from "@/features/admin-entries/admin-entries-schemas";
import EntriesPage from "@/features/admin-entries/components/entries-page";

export const Route = createFileRoute("/admin/entries")({
  validateSearch: adminEntriesSearchSchema,
  // Without stripping, the defaulted ?page=1 would be added to the URL by a redirect.
  search: { middlewares: [stripSearchParams({ page: 1 })] },
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(adminEntriesQueryOptions(deps)),
  component: EntriesRoute,
});

function EntriesRoute() {
  return <EntriesPage search={Route.useSearch()} />;
}
