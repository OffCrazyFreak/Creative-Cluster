import {
  and,
  desc,
  eq,
  ilike,
  isNotNull,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { STALE_CONFIRM_MONTHS } from "@/constants/lifecycle";
import { db } from "@/db/client.server";
import { entry, user } from "@/db/schema";
import { escapeLike } from "@/utils/escape-like";

import {
  ADMIN_ENTRIES_PAGE_SIZE,
  type AdminEntriesSearch,
  type IAdminEntriesPage,
} from "./admin-entries-schemas";

function filters(input: AdminEntriesSearch): SQL | undefined {
  const conditions: SQL[] = [];
  if (input.status) conditions.push(eq(entry.status, input.status));
  if (input.kind) conditions.push(eq(entry.kind, input.kind));
  if (input.country) conditions.push(eq(entry.countryCode, input.country));
  if (input.trusted)
    conditions.push(eq(entry.trusted, input.trusted === "yes"));
  if (input.stale)
    conditions.push(
      sql`coalesce(${entry.lastConfirmedAt}, ${entry.publishedAt}, ${entry.createdAt}) < now() - make_interval(months => ${STALE_CONFIRM_MONTHS})`,
    );
  if (input.unclaimed)
    conditions.push(isNotNull(entry.importedAt), isNull(entry.ownerUserId));
  if (input.emailInvalid) conditions.push(eq(entry.contactEmailInvalid, true));
  if (input.q) {
    const pattern = `%${escapeLike(input.q)}%`;
    conditions.push(
      or(
        ilike(entry.name, pattern),
        ilike(entry.slug, pattern),
        ilike(entry.contactEmail, pattern),
        ilike(user.email, pattern),
      ) as SQL,
    );
  }
  return conditions.length ? and(...conditions) : undefined;
}

export async function listAdminEntries(
  input: AdminEntriesSearch,
): Promise<IAdminEntriesPage> {
  const where = filters(input);
  const [rows, [totals]] = await Promise.all([
    db
      .select({
        id: entry.id,
        name: entry.name,
        slug: entry.slug,
        kind: entry.kind,
        status: entry.status,
        trusted: entry.trusted,
        countryCode: entry.countryCode,
        ownerEmail: user.email,
        lastConfirmedAt: entry.lastConfirmedAt,
        importedAt: entry.importedAt,
        contactEmailInvalid: entry.contactEmailInvalid,
      })
      .from(entry)
      .leftJoin(user, eq(user.id, entry.ownerUserId))
      .where(where)
      .orderBy(desc(entry.updatedAt), desc(entry.id))
      .limit(ADMIN_ENTRIES_PAGE_SIZE)
      .offset((input.page - 1) * ADMIN_ENTRIES_PAGE_SIZE),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(entry)
      .leftJoin(user, eq(user.id, entry.ownerUserId))
      .where(where),
  ]);
  return {
    rows: rows.map((row) => ({
      ...row,
      lastConfirmedAt: row.lastConfirmedAt?.toISOString() ?? null,
      importedAt: row.importedAt?.toISOString() ?? null,
    })),
    total: totals.total,
    pageSize: ADMIN_ENTRIES_PAGE_SIZE,
  };
}
