import { Link } from "@tanstack/react-router";

import { m } from "@/paraglide/messages";

import AuthPage from "./auth-page";
import NewPasswordForm from "./new-password-form";

interface ITokenPasswordPageProps {
  token: string | undefined;
  mode: "reset" | "invite";
}

// Shared by /reset-password and /set-password: same token and form, different wording.
export default function TokenPasswordPage({
  token,
  mode,
}: ITokenPasswordPageProps) {
  const title =
    mode === "invite" ? m.auth_set_title() : m.auth_reset_new_title();
  const intro = mode === "invite" ? m.auth_set_intro() : undefined;

  if (!token) {
    return (
      <AuthPage title={title}>
        <p>{m.auth_reset_invalid_token()}</p>
        <Link to="/reset-password">{m.auth_reset_request_again()}</Link>
      </AuthPage>
    );
  }
  return (
    <AuthPage title={title} intro={intro}>
      <NewPasswordForm token={token} mode={mode} />
    </AuthPage>
  );
}
