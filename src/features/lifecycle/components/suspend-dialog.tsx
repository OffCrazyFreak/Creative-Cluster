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
import { REVERT_REASON_MAX } from "@/constants/review";
import { m } from "@/paraglide/messages";

interface ISuspendDialogProps {
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<boolean>;
}

export default function SuspendDialog({
  name,
  open,
  onOpenChange,
  onConfirm,
}: ISuspendDialogProps) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    const ok = await onConfirm(reason.trim());
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
          <DialogTitle>{m.lifecycle_suspend_title({ name })}</DialogTitle>
          <DialogDescription>{m.lifecycle_suspend_body()}</DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="suspend-reason">
            {m.lifecycle_suspend_reason()}
          </FieldLabel>
          <Textarea
            id="suspend-reason"
            value={reason}
            maxLength={REVERT_REASON_MAX}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>
        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            disabled={busy || reason.trim() === ""}
            onClick={() => void confirm()}
          >
            {m.lifecycle_suspend_confirm()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
