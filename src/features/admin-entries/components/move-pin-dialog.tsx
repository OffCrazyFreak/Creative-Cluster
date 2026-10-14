import { useQuery } from "@tanstack/react-query";
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
import {
  emptyLocation,
  PinPicker,
  type LocationValue,
} from "@/features/location";
import { m } from "@/paraglide/messages";

import { adminEntryDetailQueryOptions } from "../admin-entries-queries";
import type { MovePinError } from "../admin-entries-schemas";
import { movePinFn } from "../admin-entries.functions";
import { useAdminOp } from "../hooks/use-admin-op";

interface IMovePinDialogProps {
  entryId: string;
  name: string;
  onClose: () => void;
}

function errorText(error: MovePinError): string {
  return error === "person"
    ? m.admin_entries_pin_person()
    : m.admin_entries_transfer_not_found();
}

export default function MovePinDialog({
  entryId,
  name,
  onClose,
}: IMovePinDialogProps) {
  const run = useAdminOp();
  const { data } = useQuery(adminEntryDetailQueryOptions(entryId));
  const [value, setValue] = useState<LocationValue | null>(null);
  const [busy, setBusy] = useState(false);
  const current: LocationValue | null = data
    ? {
        ...emptyLocation(data.countryCode),
        lat: data.lat,
        lng: data.lng,
      }
    : null;
  const shown = value ?? current;

  async function confirm() {
    if (!shown || shown.lat === null || shown.lng === null) return;
    const { lat, lng } = shown;
    setBusy(true);
    const ok = await run(
      () => movePinFn({ data: { id: entryId, lat, lng } }),
      m.admin_entries_pin_done(),
      errorText,
    );
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{m.admin_entries_pin_title({ name })}</DialogTitle>
          <DialogDescription>{m.admin_entries_pin_body()}</DialogDescription>
        </DialogHeader>
        {shown && <PinPicker value={shown} onChange={setValue} />}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {m.admin_entries_cancel()}
          </Button>
          <Button
            type="button"
            disabled={busy || value === null || value.lat === null}
            onClick={() => void confirm()}
          >
            {m.admin_entries_pin_confirm()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
