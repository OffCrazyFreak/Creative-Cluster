import { createFileRoute } from "@tanstack/react-router";

import LegalPage from "@/features/legal/components/legal-page";
import { loadLegalContent } from "@/features/legal/load-content";
import { pageHead } from "@/lib/seo/page-head";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/terms")({
  loader: () => loadLegalContent("terms"),
  head: () =>
    pageHead({
      path: "/terms",
      title: m.legal_title_terms(),
      description: m.legal_description_terms(),
    }),
  component: TermsPage,
});

function TermsPage() {
  return <LegalPage source={Route.useLoaderData()} />;
}
