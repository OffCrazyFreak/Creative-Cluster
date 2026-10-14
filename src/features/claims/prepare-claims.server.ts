import { and, eq, isNotNull, isNull, notExists, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { z } from "zod";

import { CLAIM_INVITE_TTL_DAYS } from "@/constants/import";
import { db } from "@/db/client.server";
import { claimInvite, entry } from "@/db/schema";
import { hashClaimToken } from "@/features/auth/claim.server";

import { claimTokenFor } from "./claim-token.server";
import { isSuppressed } from "./email-suppression.server";

export interface IPrepareResult {
  created: number;
  invalidEmail: number;
  suppressed: number;
}

// Only imported, still unclaimed listings that have no invite yet; one invite per listing, ever.
const eligible = and(
  isNotNull(entry.importedAt),
  eq(entry.status, "published"),
  isNull(entry.ownerUserId),
  isNotNull(entry.contactEmail),
  eq(entry.contactEmailInvalid, false),
  notExists(
    db
      .select({ one: sql`1` })
      .from(claimInvite)
      .where(eq(claimInvite.entryId, entry.id)),
  ),
);

// Creates the invite rows and nothing else: no job, no mail. Sending is a separate, approved step.
export async function prepareClaimInvites(): Promise<IPrepareResult> {
  const rows = await db
    .select({ id: entry.id, email: entry.contactEmail })
    .from(entry)
    .where(eligible);
  const result: IPrepareResult = { created: 0, invalidEmail: 0, suppressed: 0 };
  for (const row of rows) {
    const email = row.email?.trim().toLowerCase() ?? "";
    if (!z.email().safeParse(email).success) {
      result.invalidEmail += 1;
      continue;
    }
    if (await isSuppressed(db, email)) {
      result.suppressed += 1;
      continue;
    }
    const inviteId = uuidv7();
    await db.insert(claimInvite).values({
      id: inviteId,
      entryId: row.id,
      email,
      tokenHash: hashClaimToken(claimTokenFor(inviteId)),
      expiresAt: sql`now() + make_interval(days => ${CLAIM_INVITE_TTL_DAYS})`,
    });
    result.created += 1;
  }
  return result;
}

export interface IPreparedInvite {
  inviteId: string;
  email: string;
  entryId: string;
  slug: string;
  name: string;
  sourceLocale: string;
  importedAt: Date;
}

// Invites that exist but have not gone out; used for the review files and for the sender.
export async function listUnsentInvites(): Promise<IPreparedInvite[]> {
  const rows = await db
    .select({
      inviteId: claimInvite.id,
      email: claimInvite.email,
      entryId: entry.id,
      slug: entry.slug,
      name: entry.name,
      sourceLocale: entry.sourceLocale,
      importedAt: entry.importedAt,
    })
    .from(claimInvite)
    .innerJoin(entry, eq(entry.id, claimInvite.entryId))
    .where(
      and(
        isNull(claimInvite.sentAt),
        isNull(claimInvite.usedAt),
        isNull(entry.ownerUserId),
        isNotNull(entry.importedAt),
      ),
    )
    .orderBy(claimInvite.createdAt);
  return rows.flatMap((row) =>
    row.importedAt ? [{ ...row, importedAt: row.importedAt }] : [],
  );
}
