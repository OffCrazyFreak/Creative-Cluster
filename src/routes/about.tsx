import { createFileRoute } from "@tanstack/react-router";

import EuEmblem from "@/features/legal/components/eu-emblem";
import LegalPage from "@/features/legal/components/legal-page";
import { loadLegalContent } from "@/features/legal/load-content";
import { pageHead } from "@/lib/seo/page-head";
import { m } from "@/paraglide/messages";
import { site } from "@/sites";

export const Route = createFileRoute("/about")({
  loader: () => loadLegalContent("about"),
  head: () =>
    pageHead({
      path: "/about",
      title: m.legal_title_about(),
      description: m.legal_description_about(),
    }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <LegalPage source={Route.useLoaderData()}>
      {site.showFundingLine && <EuEmblem height={64} />}
    </LegalPage>
  );
}
