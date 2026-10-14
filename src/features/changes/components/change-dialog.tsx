import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { REVERT_REASON_MAX } from "@/constants/review";
import { m } from "@/paraglide/messages";

import { changeDetailQueryOptions, CHANGES_KEY } from "../changes-queries";
import { revertChangeFn } from "../changes.functions";
import DiffTable from "./diff-table";

interface IChangeDialogProps {
  id: string;
  onClose: () => void;
}

export default function ChangeDialog({ id, onClose }: IChangeDialogProps) {
  const queryClient = useQueryClient();
  const { data } = useQuery(changeDetailQueryOptions(id));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function revert() {
    setBusy(true);
    try {
      const result = await revertChangeFn({ data: { id, reason } });
      if (result.status === "ok") {
        toast.success(m.review_changes_reverted_done());
        await queryClient.invalidateQueries({ queryKey: CHANGES_KEY });
        onClose();
      } else toast.error(m.review_changes_revert_failed());
    } catch {
      toast.error(m.review_changes_revert_failed());
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {m.review_changes_dialog_title({ name: data?.row.label ?? "" })}
          </DialogTitle>
          <DialogDescription>
            {m.review_changes_dialog_body()}
          </DialogDescription>
        </DialogHeader>
        {data && <DiffTable diffs={data.diffs} />}
        {data &&
          (data.revertible ? (
            <>
              <Field>
                <FieldLabel htmlFor="revert-reason">
                  {m.review_changes_reason()}
                </FieldLabel>
                <Textarea
                  id="revert-reason"
                  value={reason}
                  maxLength={REVERT_REASON_MAX}
                  onChange={(event) => setReason(event.target.value)}
                />
              </Field>
              <div>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={busy || reason.trim() === ""}
                  onClick={() => void revert()}
                >
                  {m.review_changes_revert()}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm">{m.review_changes_not_revertible()}</p>
          ))}
      </DialogContent>
    </Dialog>
  );
}
