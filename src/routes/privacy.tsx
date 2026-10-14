import { createFileRoute } from "@tanstack/react-router";

import LegalPage from "@/features/legal/components/legal-page";
import { loadLegalContent } from "@/features/legal/load-content";
import { pageHead } from "@/lib/seo/page-head";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/privacy")({
  loader: () => loadLegalContent("privacy"),
  head: () =>
    pageHead({
      path: "/privacy",
      title: m.legal_title_privacy(),
      description: m.legal_description_privacy(),
    }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return <LegalPage source={Route.useLoaderData()} />;
}
