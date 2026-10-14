import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { m } from "@/paraglide/messages";
import { downloadCsv } from "@/utils/download-csv";

import { exportLinksCsv } from "../export.functions";

export default function LinksExport() {
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      downloadCsv(await exportLinksCsv(), "connections");
    } catch {
      toast.error(m.connections_export_failed());
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">
        {m.connections_export_links_heading()}
      </h2>
      <p>{m.connections_export_links_intro()}</p>
      <Button
        className="self-start max-sm:min-h-11"
        disabled={busy}
        onClick={() => void run()}
      >
        {busy ? <Spinner /> : null}
        {m.connections_export_links_button()}
      </Button>
    </section>
  );
}
