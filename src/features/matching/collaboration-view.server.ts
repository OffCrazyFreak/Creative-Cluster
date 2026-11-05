import { and, eq } from "drizzle-orm";

import type { Db } from "@/db/client.server";
import { entry } from "@/db/schema";
import { publicEntryCondition } from "@/features/entry/public-entry-filter.server";

import type { ICollaborationView } from "./matching-schemas";
import { findCollaborators } from "./matching.server";

// Reason lines use the shown entry's viewpoint, so the client needs its name and whether the reader owns it.
export async function findCollaborationView(
  db: Db,
  entryId: string,
  viewerId: string | null,
): Promise<ICollaborationView> {
  const [result, [owner]] = await Promise.all([
    findCollaborators(db, entryId),
    db
      .select({ name: entry.name, ownerUserId: entry.ownerUserId })
      .from(entry)
      .where(and(eq(entry.id, entryId), publicEntryCondition()))
      .limit(1),
  ]);
  // The endpoint is public: an entry that is not shown must not leak its name.
  if (!owner)
    return { mode: "collaborate", cards: [], entryName: "", viewerOwns: false };
  return {
    ...result,
    entryName: owner.name,
    viewerOwns: Boolean(viewerId) && owner.ownerUserId === viewerId,
  };
}
