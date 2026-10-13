import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { m } from "@/paraglide/messages";

import { removeAdminUser } from "../admin-users.functions";
import { useUserActions } from "../hooks/use-user-actions";
import type { IAdminUserRow } from "../admin-users-schemas";

interface IRemoveDialogProps {
  user: IAdminUserRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RemoveDialog({
  user,
  open,
  onOpenChange,
}: IRemoveDialogProps) {
  const perform = useUserActions();
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const ok = await perform(
      removeAdminUser({ data: { userId: user.id } }),
      m.admin_users_removed(),
    );
    setBusy(false);
    if (ok) onOpenChange(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {m.admin_users_remove_title({ email: user.email })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {m.admin_users_remove_body()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{m.common_cancel()}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={busy}
            onClick={() => void submit()}
          >
            {m.admin_users_remove_confirm()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
