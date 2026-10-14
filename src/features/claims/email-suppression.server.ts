import { createHmac } from "node:crypto";

import { eq } from "drizzle-orm";

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
