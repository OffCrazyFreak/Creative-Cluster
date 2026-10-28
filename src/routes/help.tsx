import type { QueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { isUnauthorized } from "@/features/account/is-unauthorized";
import HelpGuides from "@/features/legal/components/help-guides";
import { loadAdminHelp, loadLegalContent } from "@/features/legal/load-content";
import { VIEWER_QUERY_KEY } from "@/features/session/session-queries";
import { pageHead } from "@/lib/seo/page-head";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/help")({
  // Operations detail (deploys, backups) goes only to admins, never into the public page payload.
  loader: async ({ context }) => ({
    owner: await loadLegalContent("help-owner"),
    admin:
      context.viewer?.role === "admin"
        ? await adminHelpOrNull(context.queryClient)
        : null,
  }),
  head: () =>
    pageHead({
      path: "/help",
      title: m.legal_title_help(),
      description: m.legal_description_help(),
    }),
  component: HelpPage,
});

// The page is public, so an admin whose session expired reads it like any visitor instead of
// being sent to log in; the cached viewer is dropped so the next page sees them as logged out.
async function adminHelpOrNull(queryClient: QueryClient) {
  try {
    return await loadAdminHelp();
  } catch (error) {
    if (!isUnauthorized(error)) throw error;
    queryClient.setQueryData(VIEWER_QUERY_KEY, null);
    return null;
  }
}

function HelpPage() {
  const { owner, admin } = Route.useLoaderData();
  return <HelpGuides owner={owner} admin={admin} />;
}
