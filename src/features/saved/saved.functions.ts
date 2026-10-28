import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { memberGuard } from "@/server/guards";

import { listSavedEntries, replaceSavedList } from "./saved-entries.server";
import { replaceSavedInput } from "./saved-schemas";

export const getSavedEntries = createServerFn({ method: "GET" })
  .middleware([memberGuard])
  .inputValidator(z.void())
  .handler(({ context }) => listSavedEntries(context.user.id));

export const replaceSavedEntries = createServerFn({ method: "POST" })
  .middleware([memberGuard])
  .inputValidator(replaceSavedInput)
  .handler(({ data, context }) => replaceSavedList(context.user.id, data.keys));
