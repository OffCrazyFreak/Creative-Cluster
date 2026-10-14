import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { m } from "@/paraglide/messages";
import { downloadCsv } from "@/utils/download-csv";

import { exportEntriesCsv } from "../export-entries.functions";

export default function EntriesExport() {
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      downloadCsv(await exportEntriesCsv(), "entries");
    } catch {
      toast.error(m.admin_export_failed());
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">
        {m.admin_export_entries_heading()}
      </h2>
      <p>{m.admin_export_entries_intro()}</p>
      <Button
        className="self-start max-sm:min-h-11"
        disabled={busy}
        onClick={() => void run()}
      >
        {busy ? <Spinner /> : null}
        {m.admin_export_entries_button()}
      </Button>
    </section>
  );
}
