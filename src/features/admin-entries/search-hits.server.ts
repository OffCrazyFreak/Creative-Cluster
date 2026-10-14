import { and, asc, ilike, ne, or, sql } from "drizzle-orm";

import { db } from "@/db/client.server";
import { entry, user } from "@/db/schema";

import type { IEntryHit, IUserHit } from "./admin-entries-schemas";

const HITS = 8;

function like(text: string): string {
  return `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

export async function searchUsers(q: string): Promise<IUserHit[]> {
  return db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(or(ilike(user.name, like(q)), ilike(user.email, like(q))))
    .orderBy(asc(user.email))
    .limit(HITS);
}

// Merge targets are real listings only: never another outside partner.
export async function searchRealEntries(q: string): Promise<IEntryHit[]> {
  return db
    .select({
      id: entry.id,
      name: entry.name,
      slug: entry.slug,
      status: entry.status,
    })
    .from(entry)
    .where(
      and(
        ne(entry.kind, "outside_partner"),
        sql`${entry.erasureRequestedAt} is null`,
        or(ilike(entry.name, like(q)), ilike(entry.slug, like(q))),
      ),
    )
    .orderBy(asc(entry.name))
    .limit(HITS);
}
