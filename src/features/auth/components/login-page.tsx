import { Link } from "@tanstack/react-router";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { m } from "@/paraglide/messages";

import AuthPage from "./auth-page";
import GoogleButton from "./google-button";
import LoginForm from "./login-form";

interface ILoginPageProps {
  googleEnabled: boolean;
  redirect?: string;
  failed: boolean;
}

export default function LoginPage({
  googleEnabled,
  redirect,
  failed,
}: ILoginPageProps) {
  return (
    <AuthPage title={m.auth_login_title()} intro={m.auth_login_intro()}>
      {failed && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{m.auth_login_error_google()}</AlertDescription>
        </Alert>
      )}
      <LoginForm redirect={redirect} />
      {googleEnabled && <GoogleButton />}
      <Link to="/reset-password">{m.auth_login_forgot()}</Link>
      <p className="text-sm">
        {m.auth_login_invite_only()}{" "}
        <Link to="/apply">{m.common_nav_apply()}</Link>
      </p>
    </AuthPage>
  );
}
