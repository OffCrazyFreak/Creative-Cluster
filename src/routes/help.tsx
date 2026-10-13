import { createFileRoute } from "@tanstack/react-router";

import PagePlaceholder from "@/components/custom/layout/page-placeholder";

export const Route = createFileRoute("/help")({
  component: () => <PagePlaceholder title="Help" />,
});
