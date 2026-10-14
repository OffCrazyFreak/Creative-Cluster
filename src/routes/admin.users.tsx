import { createFileRoute } from "@tanstack/react-router";

import { adminUsersQueryOptions } from "@/features/admin-users/admin-users-queries";
import AdminUsersPage from "@/features/admin-users/components/admin-users-page";

export const Route = createFileRoute("/admin/users")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(adminUsersQueryOptions()),
  component: AdminUsersPage,
});
