import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { m } from "@/paraglide/messages";

import { banAdminUser } from "../admin-users.functions";
import { useUserActions } from "../hooks/use-user-actions";
import type { IAdminUserRow } from "../admin-users-schemas";

interface IBanDialogProps {
  user: IAdminUserRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BanDialog({
  user,
  open,
  onOpenChange,
}: IBanDialogProps) {
  const perform = useUserActions();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const ok = await perform(
      banAdminUser({ data: { userId: user.id, reason } }),
      m.admin_users_banned(),
    );
    setBusy(false);
    if (ok) {
      setReason("");
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {m.admin_users_ban_title({ email: user.email })}
          </DialogTitle>
          <DialogDescription>{m.admin_users_ban_body()}</DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor={`ban-reason-${user.id}`}>
            {m.admin_users_ban_reason()}
          </FieldLabel>
          <Textarea
            id={`ban-reason-${user.id}`}
            value={reason}
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>
        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            disabled={busy || reason.trim() === ""}
            onClick={() => void submit()}
          >
            {m.admin_users_ban_confirm()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
