import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

import { exportMyDataFn } from "../lifecycle.functions";

export default function DataExportSection() {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const json = await exportMyDataFn();
      const url = URL.createObjectURL(
        new Blob([json], { type: "application/json" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `my-data-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(m.lifecycle_export_failed());
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-2" aria-labelledby="export-title">
      <h2 id="export-title" className="text-xl font-semibold">
        {m.lifecycle_export_title()}
      </h2>
      <p className="text-sm">{m.lifecycle_export_body()}</p>
      <div>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => void download()}
        >
          {m.lifecycle_export_button()}
        </Button>
      </div>
    </section>
  );
}
