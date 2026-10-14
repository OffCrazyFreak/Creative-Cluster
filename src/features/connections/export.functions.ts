import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { adminGuard } from "@/server/guards";

import { exportConfirmedLinks } from "./export-links.server";

export const exportLinksCsv = createServerFn({ method: "GET" })
  .middleware([adminGuard])
  .inputValidator(z.void())
  .handler(() => exportConfirmedLinks());
