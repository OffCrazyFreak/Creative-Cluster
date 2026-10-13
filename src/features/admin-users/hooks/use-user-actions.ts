import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { MIN_ADMINS } from "@/constants/roles";
import { m } from "@/paraglide/messages";

import type { UserActionError, UserActionResult } from "../admin-users-schemas";
import { ADMIN_USERS_QUERY_KEY } from "../admin-users-queries";

function errorText(error: UserActionError): string {
  if (error === "min_admins")
    return m.admin_users_min_admins({ min: MIN_ADMINS });
  if (error === "exists") return m.admin_users_invite_exists();
  return m.admin_users_failed();
}

// Every action reports in a toast and refreshes the list; the 2-admin rule shows its own message.
export function useUserActions() {
  const queryClient = useQueryClient();
  return async function perform(
    action: Promise<UserActionResult>,
    successText: string,
  ): Promise<boolean> {
    const result = await action;
    if (result.ok) {
      toast.success(successText);
      await queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
    } else {
      toast.error(errorText(result.error));
    }
    return result.ok;
  };
}
