import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import TokenPasswordPage from "@/features/auth/components/token-password-page";

const searchSchema = z.object({
  token: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/set-password")({
  validateSearch: searchSchema,
  component: SetPasswordRoute,
});

function SetPasswordRoute() {
  const { token } = Route.useSearch();
  return <TokenPasswordPage token={token} mode="invite" />;
}
