import { Link } from "@tanstack/react-router";

import { m } from "@/paraglide/messages";

import AuthPage from "./auth-page";
import ClaimPanel from "./claim-panel";

interface IClaimPageProps {
  token: string;
  invite: { entryName: string; email: string } | null;
}

export default function ClaimPage({ token, invite }: IClaimPageProps) {
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
