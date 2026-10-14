import { createFileRoute } from "@tanstack/react-router";

import LegalPage from "@/features/legal/components/legal-page";
import { loadLegalContent } from "@/features/legal/load-content";
import { pageHead } from "@/lib/seo/page-head";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/accessibility")({
  loader: () => loadLegalContent("accessibility"),
  head: () =>
    pageHead({
      path: "/accessibility",
      title: m.legal_title_accessibility(),
      description: m.legal_description_accessibility(),
    }),
  component: AccessibilityPage,
});

function AccessibilityPage() {
  return <LegalPage source={Route.useLoaderData()} />;
}
