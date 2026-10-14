import { createHash, randomBytes } from "node:crypto";

import { and, eq, gt, like } from "drizzle-orm";

import { db, type DbOrTx } from "@/db/client.server";
import { verification } from "@/db/schema";

export type ApplicationTokenKind = "apply-verify" | "apply-edit";

// Only a hash is stored, so a leaked database cannot be used to confirm or edit applications.
function identifier(kind: ApplicationTokenKind, token: string): string {
  const hash = createHash("sha256").update(token).digest("hex");
  return `${kind}:${hash}`;
}

// A stable digest for idempotency keys, so the raw token never becomes a second stored copy.
export function tokenDigest(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 16);
}

// A new address or a finished resubmission makes older links for the same entry useless.
export async function revokeApplicationTokens(
  tx: DbOrTx,
  kind: ApplicationTokenKind,
  entryId: string,
) {
  await tx
    .delete(verification)
    .where(
      and(
        like(verification.identifier, `${kind}:%`),
        eq(verification.value, entryId),
      ),
    );
}

export async function issueApplicationToken(
  tx: DbOrTx,
  kind: ApplicationTokenKind,
  entryId: string,
  ttlSeconds: number,
): Promise<string> {
  const token = randomBytes(24).toString("base64url");
  await tx.insert(verification).values({
    identifier: identifier(kind, token),
    value: entryId,
    expiresAt: new Date(Date.now() + ttlSeconds * 1000),
  });
  return token;
}

export async function entryIdForToken(
  kind: ApplicationTokenKind,
  token: string,
  tx: DbOrTx = db,
): Promise<string | null> {
  const [row] = await tx
    .select({ entryId: verification.value })
    .from(verification)
    .where(
      and(
        eq(verification.identifier, identifier(kind, token)),
        gt(verification.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return row?.entryId ?? null;
}
