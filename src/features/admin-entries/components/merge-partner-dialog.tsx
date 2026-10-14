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
import { statusLabel } from "@/features/lifecycle/status-label";
import { m } from "@/paraglide/messages";

import type { IEntryHit, MergeError } from "../admin-entries-schemas";
import {
  mergePartnerFn,
  searchRealEntriesFn,
} from "../admin-entries.functions";
import { useAdminOp } from "../hooks/use-admin-op";
import HitPicker from "./hit-picker";

interface IMergePartnerDialogProps {
  stubId: string;
  name: string;
  onClose: () => void;
  onMerged: () => void;
}

function errorText(error: MergeError): string {
  return error === "not_a_stub"
    ? m.admin_entries_merge_not_stub()
    : m.admin_entries_merge_bad_target();
}

export default function MergePartnerDialog({
  stubId,
  name,
  onClose,
  onMerged,
}: IMergePartnerDialogProps) {
  const run = useAdminOp();
  const [target, setTarget] = useState<IEntryHit | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    if (!target) return;
    setBusy(true);
    const ok = await run(
      () => mergePartnerFn({ data: { stubId, targetId: target.id } }),
      m.admin_entries_merge_done(),
      errorText,
    );
    setBusy(false);
    if (ok) onMerged();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.admin_entries_merge_title({ name })}</DialogTitle>
          <DialogDescription>{m.admin_entries_merge_body()}</DialogDescription>
        </DialogHeader>
        <HitPicker<IEntryHit>
          id="merge-target"
          label={m.admin_entries_merge_search()}
          queryKey="entry-hits"
          search={(q) => searchRealEntriesFn({ data: { q } })}
          describe={(hit) => `${hit.name} (${statusLabel(hit.status)})`}
          onSelect={setTarget}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {m.admin_entries_cancel()}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!target || busy}
            onClick={() => void confirm()}
          >
            {m.admin_entries_merge_confirm()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
