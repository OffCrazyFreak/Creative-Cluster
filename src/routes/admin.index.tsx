import { createFileRoute } from "@tanstack/react-router";

import PagePlaceholder from "@/components/custom/layout/page-placeholder";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/admin/")({
  component: () => <PagePlaceholder title={m.admin_home_title()} />,
});
