import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import { adminGuard } from "@/server/guards";

import { exportConfirmedLinks } from "./export-links.server";

export const exportLinksCsv = createServerFn({ method: "GET" })
  .middleware([adminGuard])
  .inputValidator(z.void())
  .handler(async () => {
    // Bulk admin data must never sit in a browser or CDN cache.
    setResponseHeader("Cache-Control", "no-store");
    return exportConfirmedLinks();
  });
