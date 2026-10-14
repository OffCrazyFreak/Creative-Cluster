import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { adminGuard } from "@/server/guards";

import { importFileInputSchema } from "./import-admin-schemas";
import { previewStagingFile, runStagingFile } from "./import-admin.server";
import { listImportedWithoutPrecisePin } from "./import-run.server";

export const previewImportFile = createServerFn({ method: "POST" })
  .middleware([adminGuard])
  .inputValidator(importFileInputSchema)
  .handler(({ data }) => previewStagingFile(data.json));

export const runImportFile = createServerFn({ method: "POST" })
  .middleware([adminGuard])
  .inputValidator(importFileInputSchema)
  .handler(({ data }) => runStagingFile(data.json));

export const listUnpinnedImports = createServerFn({ method: "GET" })
  .middleware([adminGuard])
  .inputValidator(z.void())
  .handler(() => listImportedWithoutPrecisePin());
