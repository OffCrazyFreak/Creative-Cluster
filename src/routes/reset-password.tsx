import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import ResetPasswordPage from "@/features/auth/components/reset-password-page";

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
  return <ResetPasswordPage token={token} failed={Boolean(error)} />;
}
