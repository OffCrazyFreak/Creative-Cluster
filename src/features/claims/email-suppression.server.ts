import { createHmac } from "node:crypto";

import { eq, inArray } from "drizzle-orm";

import type { SuppressionReason } from "@/constants/import";
import type { DbOrTx } from "@/db/client.server";
import { emailSuppression } from "@/db/schema";
import { env } from "@/env.server";

// Keyed with the site secret so a leaked table cannot be checked against a list of addresses.
// Rotating PSEUDONYM_SECRET empties the list in effect: re-add the addresses first.
export function suppressionHash(email: string): string {
  return createHmac("sha256", env.PSEUDONYM_SECRET)
    .update(email.trim().toLowerCase())
    .digest("hex");
}

export async function suppressEmail(
  tx: DbOrTx,
  email: string,
  reason: SuppressionReason,
) {
  await tx
    .insert(emailSuppression)
    .values({ emailHash: suppressionHash(email), reason })
    .onConflictDoNothing({ target: emailSuppression.emailHash });
}

export async function isSuppressed(
  tx: DbOrTx,
  email: string,
): Promise<boolean> {
  const [row] = await tx
    .select({ id: emailSuppression.id })
    .from(emailSuppression)
    .where(eq(emailSuppression.emailHash, suppressionHash(email)))
    .limit(1);
  return Boolean(row);
}

// One query for a whole batch; returns the lower-cased addresses that must not be written to.
export async function suppressedAmong(
  tx: DbOrTx,
  emails: string[],
): Promise<Set<string>> {
  const byHash = new Map(
    emails.map((email) => [suppressionHash(email), email.trim().toLowerCase()]),
  );
  if (byHash.size === 0) return new Set();
  const rows = await tx
    .select({ hash: emailSuppression.emailHash })
    .from(emailSuppression)
    .where(inArray(emailSuppression.emailHash, [...byHash.keys()]));
  return new Set(rows.flatMap((row) => byHash.get(row.hash) ?? []));
}
