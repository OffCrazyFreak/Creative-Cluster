import SuspendDialog from "@/features/lifecycle/components/suspend-dialog";
import { useLifecycleAction } from "@/features/lifecycle/hooks/use-lifecycle-action";
import { suspendEntryFn } from "@/features/lifecycle/lifecycle.functions";

import { ADMIN_KEY } from "../admin-entries-queries";
import type { IEntryDialog } from "../entry-dialog-state";
import ChangeSlugDialog from "./change-slug-dialog";
import MergePartnerDialog from "./merge-partner-dialog";
import MovePinDialog from "./move-pin-dialog";
import TransferOwnerDialog from "./transfer-owner-dialog";

interface IEntryDialogsProps {
  dialog: IEntryDialog | null;
  onClose: () => void;
  // The merged stub no longer exists, so a page about it must leave.
  onMerged?: () => void;
}

export default function EntryDialogs({
  dialog,
  onClose,
  onMerged,
}: IEntryDialogsProps) {
  const run = useLifecycleAction(ADMIN_KEY);
  if (!dialog) return null;
  const { row } = dialog;

  switch (dialog.kind) {
    case "suspend":
      return (
        <SuspendDialog
          name={row.name}
          open
          onOpenChange={(open) => !open && onClose()}
          onConfirm={(reason) =>
            run(() => suspendEntryFn({ data: { id: row.id, reason } }))
          }
        />
      );
    case "transfer":
      return (
        <TransferOwnerDialog
          entryId={row.id}
          name={row.name}
          onClose={onClose}
        />
      );
    case "merge":
      return (
        <MergePartnerDialog
          stubId={row.id}
          name={row.name}
          onClose={onClose}
          onMerged={() => {
            onClose();
            onMerged?.();
          }}
        />
      );
    case "pin":
      return (
        <MovePinDialog entryId={row.id} name={row.name} onClose={onClose} />
      );
    case "slug":
      return (
        <ChangeSlugDialog
          entryId={row.id}
          name={row.name}
          slug={row.slug}
          onClose={onClose}
        />
      );
  }
}
