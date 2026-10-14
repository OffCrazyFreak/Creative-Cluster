import { createFileRoute } from "@tanstack/react-router";

import ImportPage from "@/features/import/components/import-page";

export const Route = createFileRoute("/admin/import")({
  component: ImportPage,
});
