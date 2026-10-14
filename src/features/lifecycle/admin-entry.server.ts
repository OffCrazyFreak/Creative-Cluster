import { eq } from "drizzle-orm";

import { db } from "@/db/client.server";
import { entry, user } from "@/db/schema";
import { NotFoundError } from "@/server/errors";

import type { IAdminEntry } from "./lifecycle-schemas";

export async function getAdminEntry(id: string): Promise<IAdminEntry> {
  const [row] = await db
    .select({ entry, ownerEmail: user.email })
    .from(entry)
    .leftJoin(user, eq(user.id, entry.ownerUserId))
    .where(eq(entry.id, id))
    .limit(1);
  if (!row) throw new NotFoundError();
  const { entry: e } = row;
  return {
    id: e.id,
    name: e.name,
    slug: e.slug,
    kind: e.kind,
    status: e.status,
    trusted: e.trusted,
    suspendedReason: e.suspendedReason,
    lastConfirmedAt: e.lastConfirmedAt?.toISOString() ?? null,
    importedAt: e.importedAt?.toISOString() ?? null,
    erasureRequestedAt: e.erasureRequestedAt?.toISOString() ?? null,
    ownerEmail: row.ownerEmail,
  };
}
