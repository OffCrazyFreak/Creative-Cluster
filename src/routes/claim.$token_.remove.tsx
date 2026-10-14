import { createFileRoute } from "@tanstack/react-router";

import ClaimRemovePage from "@/features/claims/components/claim-remove-page";
import { getRemovalInvite } from "@/features/claims/claims.functions";

export const Route = createFileRoute("/claim/$token_/remove")({
  loader: ({ params }) => getRemovalInvite({ data: { token: params.token } }),
  component: ClaimRemoveRoute,
});

function ClaimRemoveRoute() {
  const { token } = Route.useParams();
  return <ClaimRemovePage token={token} invite={Route.useLoaderData()} />;
}
