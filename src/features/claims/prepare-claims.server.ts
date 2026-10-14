import { and, asc, eq, isNotNull, isNull, notExists, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { z } from "zod";

import { CLAIM_INVITE_TTL_DAYS } from "@/constants/import";
import { db } from "@/db/client.server";
import { claimInvite, entry } from "@/db/schema";
import { hashClaimToken } from "@/features/auth/claim.server";

import { openInviteCondition } from "./claim-state.server";
import { claimTokenFor } from "./claim-token.server";
import { suppressedAmong } from "./email-suppression.server";

export interface IPrepareResult {
  created: number;
  invalidEmail: number;
  suppressed: number;
  // Addresses that are the contact of more than one listing; the sender mails each address once.
  sharedAddresses: number;
}

const PREPARE_LOCK_KEY = 7_315_002;
const INSERT_CHUNK = 500;

// Only imported, still unclaimed listings that have no invite yet; one invite per listing, ever.
function eligible() {
  return and(
    isNotNull(entry.importedAt),
    eq(entry.status, "published"),
    isNull(entry.ownerUserId),
    isNull(entry.erasureRequestedAt),
    isNotNull(entry.contactEmail),
    eq(entry.contactEmailInvalid, false),
    notExists(
      db
        .select({ one: sql`1` })
        .from(claimInvite)
        .where(eq(claimInvite.entryId, entry.id)),
    ),
  );
}

// Creates the invite rows and nothing else: no job, no mail. Sending is a separate, approved step.
// The lock keeps two overlapping runs from giving one listing two valid tokens.
export async function prepareClaimInvites(): Promise<IPrepareResult> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${PREPARE_LOCK_KEY})`);
    const rows = await tx
      .select({ id: entry.id, email: entry.contactEmail })
      .from(entry)
      .where(eligible());
    const result: IPrepareResult = {
      created: 0,
      invalidEmail: 0,
      suppressed: 0,
      sharedAddresses: 0,
    };
    const valid: { entryId: string; email: string }[] = [];
    for (const row of rows) {
      const email = row.email?.trim().toLowerCase() ?? "";
      if (z.email().safeParse(email).success)
        valid.push({ entryId: row.id, email });
      else result.invalidEmail += 1;
    }
    const blocked = await suppressedAmong(
      tx,
      valid.map((row) => row.email),
    );
    const open = valid.filter((row) => !blocked.has(row.email));
    result.suppressed = valid.length - open.length;
    const perAddress = new Map<string, number>();
    for (const row of open)
      perAddress.set(row.email, (perAddress.get(row.email) ?? 0) + 1);
    result.sharedAddresses = [...perAddress.values()].filter(
      (count) => count > 1,
    ).length;

    for (let start = 0; start < open.length; start += INSERT_CHUNK) {
      await tx.insert(claimInvite).values(
        open.slice(start, start + INSERT_CHUNK).map((row) => {
          const id = uuidv7();
          return {
            id,
            entryId: row.entryId,
            email: row.email,
            tokenHash: hashClaimToken(claimTokenFor(id)),
            // Restarted when the mail is sent: review can take longer than the links should live.
            expiresAt: sql`now() + make_interval(days => ${CLAIM_INVITE_TTL_DAYS})`,
          };
        }),
      );
    }
    result.created = open.length;
    return result;
  });
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
// Re-checks what can change after preparing: removal (suppression), archive, erasure, bounces.
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
        openInviteCondition,
        isNotNull(entry.importedAt),
      ),
    )
    .orderBy(asc(claimInvite.createdAt));
  const blocked = await suppressedAmong(
    db,
    rows.map((row) => row.email),
  );
  return rows.flatMap((row) =>
    row.importedAt && !blocked.has(row.email.toLowerCase())
      ? [{ ...row, importedAt: row.importedAt }]
      : [],
  );
}
