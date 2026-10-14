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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { m } from "@/paraglide/messages";

import type { SlugError } from "../admin-entries-schemas";
import { changeSlugFn } from "../admin-entries.functions";
import { useAdminOp } from "../hooks/use-admin-op";

interface IChangeSlugDialogProps {
  entryId: string;
  name: string;
  slug: string;
  onClose: () => void;
}

function errorText(error: SlugError): string {
  if (error === "taken") return m.admin_entries_slug_taken();
  if (error === "invalid") return m.admin_entries_slug_invalid();
  return m.admin_entries_transfer_not_found();
}

export default function ChangeSlugDialog({
  entryId,
  name,
  slug,
  onClose,
}: IChangeSlugDialogProps) {
  const run = useAdminOp();
  const [value, setValue] = useState(slug);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    const ok = await run(
      () => changeSlugFn({ data: { id: entryId, slug: value } }),
      m.admin_entries_slug_done(),
      errorText,
    );
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.admin_entries_slug_title({ name })}</DialogTitle>
          <DialogDescription>{m.admin_entries_slug_body()}</DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="entry-slug">
            {m.admin_entries_slug_label()}
          </FieldLabel>
          <Input
            id="entry-slug"
            value={value}
            maxLength={80}
            autoComplete="off"
            onChange={(event) => setValue(event.target.value)}
          />
          <FieldDescription>{m.admin_entries_slug_hint()}</FieldDescription>
        </Field>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {m.admin_entries_cancel()}
          </Button>
          <Button
            type="button"
            disabled={busy || value.trim() === "" || value.trim() === slug}
            onClick={() => void confirm()}
          >
            {m.admin_entries_slug_confirm()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
