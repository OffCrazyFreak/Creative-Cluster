import { createServerFn } from "@tanstack/react-start";

import { db } from "@/db/client.server";
import { publicGuard } from "@/server/guards";

import { collaborationInput } from "./matching-schemas";
import { findCollaborators } from "./matching.server";

export const getCollaborationCards = createServerFn({ method: "GET" })
  .middleware([publicGuard])
  .inputValidator(collaborationInput)
  .handler(({ data }) => findCollaborators(db, data.entryId));
