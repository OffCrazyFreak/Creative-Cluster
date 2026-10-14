import { createFileRoute } from "@tanstack/react-router";

import LegalPage from "@/features/legal/components/legal-page";
import { loadLegalContent } from "@/features/legal/load-content";
import { pageHead } from "@/lib/seo/page-head";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/imprint")({
  loader: () => loadLegalContent("imprint"),
  head: () =>
    pageHead({
      path: "/imprint",
      title: m.legal_title_imprint(),
      description: m.legal_description_imprint(),
    }),
  component: ImprintPage,
});

function ImprintPage() {
  return <LegalPage source={Route.useLoaderData()} />;
}
