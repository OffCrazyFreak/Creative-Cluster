import { createServerFn } from "@tanstack/react-start";

import { db } from "@/db/client.server";
import { publicGuard } from "@/server/guards";

import { collaborationInput } from "./matching-schemas";
import { findCollaborationView } from "./collaboration-view.server";

export const getCollaborationCards = createServerFn({ method: "GET" })
  .middleware([publicGuard])
  .inputValidator(collaborationInput)
  .handler(({ data, context }) =>
    findCollaborationView(db, data.entryId, context.session?.user.id ?? null),
  );
