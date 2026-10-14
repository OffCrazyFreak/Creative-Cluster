import { eq } from "drizzle-orm";

import type { Db } from "@/db/client.server";
import { entry } from "@/db/schema";

import type { ICollaborationView } from "./matching-schemas";
import { findCollaborators } from "./matching.server";

// The reason lines are written from the viewpoint of the entry whose page is shown, so the client needs its name
// and whether the reader owns it ("which you seek" only makes sense for the owner).
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
      .where(eq(entry.id, entryId))
      .limit(1),
  ]);
  return {
    ...result,
    entryName: owner?.name ?? "",
    viewerOwns: Boolean(viewerId) && owner?.ownerUserId === viewerId,
  };
}
