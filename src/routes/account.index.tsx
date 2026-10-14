import { createFileRoute } from "@tanstack/react-router";

import PagePlaceholder from "@/components/custom/layout/page-placeholder";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/account/")({
  component: () => <PagePlaceholder title={m.common_nav_account()} />,
});
