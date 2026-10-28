import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { adminEntryDetailQueryOptions } from "@/features/admin-entries/admin-entries-queries";
import EntryDetail from "@/features/admin-entries/components/entry-detail";
import AdminEntryPage from "@/features/lifecycle/components/admin-entry-page";
import { adminEntryQueryOptions } from "@/features/lifecycle/lifecycle-queries";
import { loginOnUnauthorized } from "@/features/session/login-on-unauthorized";

export const Route = createFileRoute("/admin/entry/$id")({
  params: { parse: (raw) => ({ id: z.uuid().parse(raw.id) }) },
  loader: ({ context, params, location }) =>
    loginOnUnauthorized({ context, location }, () =>
      Promise.all([
        context.queryClient.ensureQueryData(adminEntryQueryOptions(params.id)),
        context.queryClient.ensureQueryData(
          adminEntryDetailQueryOptions(params.id),
        ),
      ]),
    ),
  component: AdminEntryRoute,
});

function AdminEntryRoute() {
  const { id } = Route.useParams();
  return (
    <>
      <AdminEntryPage id={id} />
      <EntryDetail id={id} />
    </>
  );
}
