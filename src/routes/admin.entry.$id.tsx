import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import AdminEntryPage from "@/features/lifecycle/components/admin-entry-page";
import { adminEntryQueryOptions } from "@/features/lifecycle/lifecycle-queries";

export const Route = createFileRoute("/admin/entry/$id")({
  params: { parse: (raw) => ({ id: z.uuid().parse(raw.id) }) },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(adminEntryQueryOptions(params.id)),
  component: AdminEntryRoute,
});

function AdminEntryRoute() {
  return <AdminEntryPage id={Route.useParams().id} />;
}
