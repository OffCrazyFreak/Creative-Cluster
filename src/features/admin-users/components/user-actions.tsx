import { useState } from "react";

import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

import type { IAdminUserRow } from "../admin-users-schemas";
import { setAdminUserRole, unbanAdminUser } from "../admin-users.functions";
import { useUserActions } from "../hooks/use-user-actions";
import BanDialog from "./ban-dialog";
import RemoveDialog from "./remove-dialog";

interface IUserActionsProps {
  user: IAdminUserRow;
}

export default function UserActions({ user }: IUserActionsProps) {
  const perform = useUserActions();
  const [banOpen, setBanOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const isAdmin = user.role === "admin";

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() =>
          void perform(
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
          onClick={() =>
            void perform(
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
          onClick={() => setBanOpen(true)}
        >
          {m.admin_users_ban()}
        </Button>
      )}
      <Button
        type="button"
        size="sm"
        variant="destructive"
        onClick={() => setRemoveOpen(true)}
      >
        {m.admin_users_remove()}
      </Button>
      <BanDialog user={user} open={banOpen} onOpenChange={setBanOpen} />
      <RemoveDialog
        user={user}
        open={removeOpen}
        onOpenChange={setRemoveOpen}
      />
    </div>
  );
}
