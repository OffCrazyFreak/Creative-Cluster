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
import { m } from "@/paraglide/messages";

import type { IUserHit, TransferError } from "../admin-entries-schemas";
import { searchUsersFn, transferOwnerFn } from "../admin-entries.functions";
import { useAdminOp } from "../hooks/use-admin-op";
import HitPicker from "./hit-picker";

interface ITransferOwnerDialogProps {
  entryId: string;
  name: string;
  onClose: () => void;
}

function errorText(error: TransferError): string {
  if (error === "owner_has_entry") return m.admin_entries_transfer_has_entry();
  if (error === "blocked") return m.admin_entries_transfer_blocked();
  return m.admin_entries_transfer_not_found();
}

export default function TransferOwnerDialog({
  entryId,
  name,
  onClose,
}: ITransferOwnerDialogProps) {
  const run = useAdminOp();
  const [target, setTarget] = useState<IUserHit | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    if (!target) return;
    setBusy(true);
    const ok = await run(
      () => transferOwnerFn({ data: { id: entryId, userId: target.id } }),
      m.admin_entries_transfer_done(),
      errorText,
    );
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.admin_entries_transfer_title({ name })}</DialogTitle>
          <DialogDescription>
            {m.admin_entries_transfer_body()}
          </DialogDescription>
        </DialogHeader>
        <HitPicker<IUserHit>
          id="transfer-user"
          label={m.admin_entries_transfer_search()}
          queryKey="user-hits"
          search={(q) => searchUsersFn({ data: { q } })}
          describe={(hit) => `${hit.name} (${hit.email})`}
          onSelect={setTarget}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {m.admin_entries_cancel()}
          </Button>
          <Button
            type="button"
            disabled={!target || busy}
            onClick={() => void confirm()}
          >
            {m.admin_entries_transfer_confirm()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
