import { createFileRoute } from "@tanstack/react-router";

import PageContainer from "@/components/custom/layout/page-container";
import PagePlaceholder from "@/components/custom/layout/page-placeholder";
import ExpiringSoonNotice from "@/features/opportunities/components/expiring-soon-notice";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/account/")({
  component: () => (
    <>
      <PagePlaceholder title={m.common_nav_account()} />
      <PageContainer size="prose" className="pt-0">
        <ExpiringSoonNotice />
      </PageContainer>
    </>
  ),
});
