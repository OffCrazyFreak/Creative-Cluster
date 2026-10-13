import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import AuthPage from "@/features/auth/components/auth-page";
import ResetRequestForm from "@/features/auth/components/reset-request-form";
import TokenPasswordPage from "@/features/auth/components/token-password-page";
import { m } from "@/paraglide/messages";

const searchSchema = z.object({
  token: z.string().optional().catch(undefined),
  error: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/reset-password")({
  validateSearch: searchSchema,
  component: ResetPasswordRoute,
});

function ResetPasswordRoute() {
  const { token, error } = Route.useSearch();
  if (token || error) return <TokenPasswordPage token={token} mode="reset" />;
  return (
    <AuthPage title={m.auth_reset_title()} intro={m.auth_reset_intro()}>
      <ResetRequestForm />
    </AuthPage>
  );
}
