import { Link, createFileRoute } from "@tanstack/react-router";

import { getClaimInvite } from "@/features/auth/auth.functions";
import AuthPage from "@/features/auth/components/auth-page";
import ClaimPanel from "@/features/auth/components/claim-panel";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/claim/$token")({
  loader: ({ params }) => getClaimInvite({ data: { token: params.token } }),
  component: ClaimRoute,
});

function ClaimRoute() {
  const { token } = Route.useParams();
  const invite = Route.useLoaderData();
  return (
    <AuthPage title={m.auth_claim_title()}>
      {invite ? (
        <ClaimPanel
          token={token}
          entryName={invite.entryName}
          email={invite.email}
        />
      ) : (
        <>
          <p>{m.auth_claim_invalid()}</p>
          <p>{m.auth_claim_used_hint()}</p>
          <Link to="/login">{m.auth_login_submit()}</Link>
          <Link to="/reset-password">{m.auth_login_forgot()}</Link>
        </>
      )}
    </AuthPage>
  );
}
