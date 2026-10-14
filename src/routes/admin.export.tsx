import { createFileRoute } from "@tanstack/react-router";

import PageContainer from "@/components/custom/layout/page-container";
import LinksExport from "@/features/connections/components/links-export";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/admin/export")({
  component: AdminExport,
});

function AdminExport() {
  return (
    <PageContainer size="wide">
      <h1 className="text-2xl font-semibold">{m.connections_export_title()}</h1>
      <LinksExport />
    </PageContainer>
  );
}
