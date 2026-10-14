import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import { adminGuard } from "@/server/guards";

import { exportEntries } from "./export-entries.server";

export const exportEntriesCsv = createServerFn({ method: "GET" })
  .middleware([adminGuard])
  .inputValidator(z.void())
  .handler(async ({ context }) => {
    // Bulk contact data must never sit in a browser or CDN cache.
    setResponseHeader("Cache-Control", "no-store");
    const csv = await exportEntries();
    // Bulk personal data leaves no change_log row (that table is for edits), so the host log is the audit trail.
    console.info("entries export", { adminId: context.user.id });
    return csv;
  });
