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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { REASON_CODES, type ReasonCode } from "@/constants/moderation";
import {
  NOTE_REQUIRED_REASON_CODES,
  REVIEW_NOTE_MAX,
} from "@/constants/review";
import { m } from "@/paraglide/messages";

import { reasonLabel } from "../review-labels";

export interface IRejection {
  reasonCode: ReasonCode;
  note: string;
}

interface IRejectDialogProps {
  count: number;
  // The same reason form serves taking a post down after a report.
  mode?: "reject" | "remove";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (rejection: IRejection) => Promise<void>;
}

export default function RejectDialog({
  count,
  mode = "reject",
  open,
  onOpenChange,
  onConfirm,
}: IRejectDialogProps) {
  const [reasonCode, setReasonCode] = useState<ReasonCode>("incomplete");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const noteRequired = NOTE_REQUIRED_REASON_CODES.includes(reasonCode);

  async function confirm() {
    setBusy(true);
    await onConfirm({ reasonCode, note: note.trim() });
    setBusy(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "remove"
              ? m.review_remove_title()
              : m.review_reject_title({ count })}
          </DialogTitle>
          <DialogDescription>
            {mode === "remove"
              ? m.review_remove_body()
              : m.review_reject_body()}
          </DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="reject-reason">
            {m.review_reason_label()}
          </FieldLabel>
          <Select
            items={REASON_CODES.map((code) => ({
              value: code,
              label: reasonLabel(code),
            }))}
            value={reasonCode}
            onValueChange={(next) =>
              setReasonCode(
                REASON_CODES.find((code) => code === next) ?? "incomplete",
              )
            }
          >
            <SelectTrigger id="reject-reason" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REASON_CODES.map((code) => (
                <SelectItem key={code} value={code}>
                  {reasonLabel(code)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="reject-note">
            {noteRequired
              ? m.review_note_label_required()
              : m.review_note_label()}
          </FieldLabel>
          <Textarea
            id="reject-note"
            value={note}
            maxLength={REVIEW_NOTE_MAX}
            required={noteRequired}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            disabled={busy || (noteRequired && note.trim() === "")}
            onClick={() => void confirm()}
          >
            {mode === "remove"
              ? m.review_remove_confirm()
              : m.review_reject_confirm()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
