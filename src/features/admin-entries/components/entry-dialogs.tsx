import { useLifecycleAction } from "@/features/lifecycle/hooks/use-lifecycle-action";
import SuspendDialog from "@/features/lifecycle/components/suspend-dialog";
import { suspendEntryFn } from "@/features/lifecycle/lifecycle.functions";

import { ADMIN_KEY } from "../admin-entries-queries";
import type { IEntryDialog } from "../entry-dialog-state";

interface IEntryDialogsProps {
  dialog: IEntryDialog | null;
  onClose: () => void;
}

export default function EntryDialogs({ dialog, onClose }: IEntryDialogsProps) {
  const run = useLifecycleAction(ADMIN_KEY);
  if (!dialog) return null;

  return (
    <SuspendDialog
      name={dialog.row.name}
      open
      onOpenChange={(open) => !open && onClose()}
      onConfirm={(reason) =>
        run(() => suspendEntryFn({ data: { id: dialog.row.id, reason } }))
      }
    />
  );
}
