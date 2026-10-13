import { createFileRoute } from "@tanstack/react-router";

import { getClaimInvite } from "@/features/auth/auth.functions";
import ClaimPage from "@/features/auth/components/claim-page";

export const Route = createFileRoute("/claim/$token")({
  loader: ({ params }) => getClaimInvite({ data: { token: params.token } }),
  component: ClaimRoute,
});

function ClaimRoute() {
  const { token } = Route.useParams();
  return <ClaimPage token={token} invite={Route.useLoaderData()} />;
}
