import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { m } from "@/paraglide/messages";

import { useAdminTagActions } from "../hooks/use-admin-tag-actions";
import { tagMatchesQuery } from "../tag-label";
import type { IAdminTagRow } from "../tag-schemas";

interface ITagMergeDialogProps {
  source: IAdminTagRow;
  candidates: readonly IAdminTagRow[];
  onClose: () => void;
}

export default function TagMergeDialog({
  source,
  candidates,
  onClose,
}: ITagMergeDialogProps) {
  const { merge } = useAdminTagActions();
  const [target, setTarget] = useState<IAdminTagRow | null>(null);
  const options = candidates.filter(
    (row) =>
      row.id !== source.id && row.status === "active" && !row.canonicalId,
  );

  function confirm() {
    if (!target) return;
    merge.mutate(
      { data: { sourceId: source.id, targetId: target.id } },
      { onSuccess: onClose },
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {m.tags_admin_merge_title({ label: source.labelEn })}
          </DialogTitle>
          <DialogDescription>{m.tags_admin_merge_hint()}</DialogDescription>
        </DialogHeader>
        <Combobox
          items={options}
          value={target}
          onValueChange={setTarget}
          itemToStringLabel={(row: IAdminTagRow) => row.labelEn}
          filter={(row: IAdminTagRow, query: string) =>
            tagMatchesQuery(row, query, "en") ||
            tagMatchesQuery(row, query, "hr")
          }
        >
          <ComboboxInput placeholder={m.tags_admin_merge_target()} />
          <ComboboxContent>
            <ComboboxEmpty>{m.tags_picker_empty()}</ComboboxEmpty>
            <ComboboxList>
              {(row: IAdminTagRow) => (
                <ComboboxItem key={row.id} value={row}>
                  {row.labelEn} / {row.labelHr}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        {merge.isError && <p role="alert">{m.tags_admin_error()}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {m.tags_admin_cancel()}
          </Button>
          <Button disabled={!target || merge.isPending} onClick={confirm}>
            {m.tags_admin_merge_confirm()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
