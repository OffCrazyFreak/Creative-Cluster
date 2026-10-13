import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { getLoginOptions } from "@/features/auth/auth.functions";
import { safeRedirect } from "@/features/auth/safe-redirect";
import LoginPage from "@/features/auth/components/login-page";

const searchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
  error: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/login")({
  validateSearch: searchSchema,
  // Also what sends a freshly logged-in viewer on to the page they asked for.
  beforeLoad: ({ context, search }) => {
    if (context.viewer) {
      throw redirect({ href: safeRedirect(search.redirect) ?? "/account" });
    }
  },
  loader: () => getLoginOptions(),
  component: LoginRoute,
});

function LoginRoute() {
  const { googleEnabled } = Route.useLoaderData();
  const { redirect, error } = Route.useSearch();
  return (
    <LoginPage
      googleEnabled={googleEnabled}
      redirect={redirect}
      failed={Boolean(error)}
    />
  );
}
