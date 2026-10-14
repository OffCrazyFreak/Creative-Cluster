import { createServerFn } from "@tanstack/react-start";

import { adminGuard } from "@/server/guards";

import { adminEntriesSearchSchema } from "./admin-entries-schemas";
import { listAdminEntries } from "./list-entries.server";

export const listAdminEntriesFn = createServerFn({ method: "GET" })
  .middleware([adminGuard])
  .inputValidator(adminEntriesSearchSchema)
  .handler(({ data }) => listAdminEntries(data));
