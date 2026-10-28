import { createFileRoute } from "@tanstack/react-router";

import ConnectionsPage from "@/features/connections/components/connections-page";
import { myConnectionsQuery } from "@/features/connections/connections-queries";
import { loginOnUnauthorized } from "@/features/session/login-on-unauthorized";

export const Route = createFileRoute("/account/connections")({
  loader: ({ context, location }) =>
    loginOnUnauthorized({ context, location }, () =>
      context.queryClient.ensureQueryData(myConnectionsQuery()),
    ),
  component: ConnectionsPage,
});
