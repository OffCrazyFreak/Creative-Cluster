import { createFileRoute } from "@tanstack/react-router";

import AdminTagsPage from "@/features/tags/components/admin-tags-page";

export const Route = createFileRoute("/admin/tags")({
  component: AdminTagsPage,
});
