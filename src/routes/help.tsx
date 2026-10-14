import { createFileRoute } from "@tanstack/react-router";

import HelpGuides from "@/features/legal/components/help-guides";
import { loadAdminHelp, loadLegalContent } from "@/features/legal/load-content";
import { pageHead } from "@/lib/seo/page-head";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/help")({
  // Operations detail (deploys, backups) goes only to admins, never into the public page payload.
  loader: async ({ context }) => ({
    owner: await loadLegalContent("help-owner"),
    admin: context.viewer?.role === "admin" ? await loadAdminHelp() : null,
  }),
  head: () =>
    pageHead({
      path: "/help",
      title: m.legal_title_help(),
      description: m.legal_description_help(),
    }),
  component: HelpPage,
});

function HelpPage() {
  const { owner, admin } = Route.useLoaderData();
  return <HelpGuides owner={owner} admin={admin} />;
}
