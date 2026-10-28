import { createFileRoute, stripSearchParams } from "@tanstack/react-router";

import { adminLinksSearchSchema } from "@/features/connections/admin-links-schemas";
import AdminLinksPage from "@/features/connections/components/admin-links-page";
import { adminProposedLinksQuery } from "@/features/connections/connections-queries";
import { loginOnUnauthorized } from "@/features/session/login-on-unauthorized";

export const Route = createFileRoute("/admin/links")({
  validateSearch: adminLinksSearchSchema,
  // Without stripping, the defaulted ?page=1 would be added to the URL by a redirect.
  search: { middlewares: [stripSearchParams({ page: 1 })] },
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps, location }) =>
    loginOnUnauthorized({ context, location }, () =>
      context.queryClient.ensureQueryData(adminProposedLinksQuery(deps)),
    ),
  component: LinksRoute,
});

function LinksRoute() {
  return <AdminLinksPage search={Route.useSearch()} />;
}
