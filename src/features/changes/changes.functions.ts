import { createServerFn } from "@tanstack/react-start";

import { runInBackground } from "@/lib/auth/background-task.server";
import { triggerDrain } from "@/lib/jobs/trigger-drain.server";
import { adminGuard } from "@/server/guards";

import {
  changeIdSchema,
  changesListSchema,
  revertChangeSchema,
  type RevertResult,
} from "./changes-schemas";
import { listChanges } from "./list-changes.server";
import { getChangeDetail, revertChange } from "./revert-change.server";

export const listChangesFn = createServerFn({ method: "GET" })
  .middleware([adminGuard])
  .inputValidator(changesListSchema)
  .handler(({ data }) => listChanges(data));

export const getChangeDetailFn = createServerFn({ method: "GET" })
  .middleware([adminGuard])
  .inputValidator(changeIdSchema)
  .handler(({ data }) => getChangeDetail(data.id));

export const revertChangeFn = createServerFn({ method: "POST" })
  .middleware([adminGuard])
  .inputValidator(revertChangeSchema)
  .handler(async ({ data, context }): Promise<RevertResult> => {
    const result = await revertChange(data.id, data.reason, context.user.id);
    // Only a real revert queued mail.
    if (result.status === "ok") runInBackground(triggerDrain());
    return result;
  });
