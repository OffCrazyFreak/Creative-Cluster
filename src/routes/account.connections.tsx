import { createFileRoute } from "@tanstack/react-router";

import ConnectionsPage from "@/features/connections/components/connections-page";
import { myConnectionsQuery } from "@/features/connections/connections-queries";

export const Route = createFileRoute("/account/connections")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(myConnectionsQuery()),
  component: ConnectionsRoute,
});

function ConnectionsRoute() {
  const { viewer } = Route.useRouteContext();
  return <ConnectionsPage isAdmin={viewer?.role === "admin"} />;
}
