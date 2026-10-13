import { createFileRoute } from "@tanstack/react-router";

import PagePlaceholder from "@/components/custom/layout/page-placeholder";

export const Route = createFileRoute("/admin/")({
  component: () => <PagePlaceholder title="Review queue" />,
});
