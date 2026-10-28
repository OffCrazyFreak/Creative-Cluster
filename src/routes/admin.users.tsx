import { createFileRoute } from "@tanstack/react-router";

import { adminUsersQueryOptions } from "@/features/admin-users/admin-users-queries";
import AdminUsersPage from "@/features/admin-users/components/admin-users-page";
import { loginOnUnauthorized } from "@/features/session/login-on-unauthorized";

export const Route = createFileRoute("/admin/users")({
  loader: ({ context, location }) =>
    loginOnUnauthorized({ context, location }, () =>
      context.queryClient.ensureQueryData(adminUsersQueryOptions()),
    ),
  component: AdminUsersPage,
});
