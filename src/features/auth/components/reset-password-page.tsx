import { m } from "@/paraglide/messages";

import AuthPage from "./auth-page";
import ResetRequestForm from "./reset-request-form";
import TokenPasswordPage from "./token-password-page";

interface IResetPasswordPageProps {
  token: string | undefined;
  failed: boolean;
}

// A token (or a better-auth error redirect) means the second step; otherwise ask for a link.
export default function ResetPasswordPage({
  token,
  failed,
}: IResetPasswordPageProps) {
  if (token || failed) return <TokenPasswordPage token={token} mode="reset" />;
  return (
    <AuthPage title={m.auth_reset_title()} intro={m.auth_reset_intro()}>
      <ResetRequestForm />
    </AuthPage>
  );
}
