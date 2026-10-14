import { useState } from "react";

import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

import type { IAdminUserRow, UserActionResult } from "../admin-users-schemas";
import { setAdminUserRole, unbanAdminUser } from "../admin-users.functions";
import { useUserActions } from "../hooks/use-user-actions";

interface IUserActionsProps {
  user: IAdminUserRow;
  onBan: (user: IAdminUserRow) => void;
  onRemove: (user: IAdminUserRow) => void;
}

export default function UserActions({
  user,
  onBan,
  onRemove,
}: IUserActionsProps) {
  const perform = useUserActions();
  const [busy, setBusy] = useState(false);
  const isAdmin = user.role === "admin";

  async function run(action: Promise<UserActionResult>, text: string) {
    setBusy(true);
    await perform(action, text);
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() =>
          void run(
            setAdminUserRole({
              data: { userId: user.id, role: isAdmin ? "member" : "admin" },
            }),
            m.admin_users_role_changed(),
          )
        }
      >
        {isAdmin ? m.admin_users_make_member() : m.admin_users_make_admin()}
      </Button>
      {user.banned ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() =>
            void run(
              unbanAdminUser({ data: { userId: user.id } }),
              m.admin_users_unbanned(),
            )
          }
        >
          {m.admin_users_unban()}
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => onBan(user)}
        >
          {m.admin_users_ban()}
        </Button>
      )}
      <Button
        type="button"
        size="sm"
        variant="destructive"
        disabled={busy}
        onClick={() => onRemove(user)}
      >
        {m.admin_users_remove()}
      </Button>
    </div>
  );
}
