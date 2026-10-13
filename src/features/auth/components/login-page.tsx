import { Link } from "@tanstack/react-router";

import { m } from "@/paraglide/messages";

import AuthPage from "./auth-page";
import FormError from "./form-error";
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
      <FormError message={failed ? m.auth_login_error_google() : null} />
      <LoginForm />
      {googleEnabled && <GoogleButton redirect={redirect} />}
      <Link to="/reset-password">{m.auth_login_forgot()}</Link>
      <p className="text-sm">
        {m.auth_login_invite_only()}{" "}
        <Link to="/apply">{m.common_nav_apply()}</Link>
      </p>
    </AuthPage>
  );
}
