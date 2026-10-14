import { useRef } from "react";

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

interface IUnsavedChangesDialogProps {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
}

export default function UnsavedChangesDialog({
  open,
  onStay,
  onLeave,
}: IUnsavedChangesDialogProps) {
  // The action button also closes the dialog; that close must not count as "stay".
  const leaving = useRef(false);
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (next) leaving.current = false;
        else if (!leaving.current) onStay();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{m.account_unsaved_title()}</AlertDialogTitle>
          <AlertDialogDescription>
            {m.account_unsaved_body()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{m.account_unsaved_stay()}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              leaving.current = true;
              onLeave();
            }}
          >
            {m.account_unsaved_leave()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
