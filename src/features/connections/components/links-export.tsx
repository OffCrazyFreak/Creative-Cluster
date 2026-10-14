import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { m } from "@/paraglide/messages";

import { exportLinksCsv } from "../export.functions";

// The byte order mark makes Excel read the file as UTF-8, which Croatian names need.
function download(csv: string) {
  const url = URL.createObjectURL(
    new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `connections-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function LinksExport() {
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      download(await exportLinksCsv());
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
