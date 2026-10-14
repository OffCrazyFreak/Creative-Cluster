import { queryOptions } from "@tanstack/react-query";

import { listAdminUsers } from "./admin-users.functions";

export const ADMIN_USERS_QUERY_KEY = ["admin", "users"] as const;

export function adminUsersQueryOptions() {
  return queryOptions({
    queryKey: ADMIN_USERS_QUERY_KEY,
    queryFn: () => listAdminUsers(),
  });
}
