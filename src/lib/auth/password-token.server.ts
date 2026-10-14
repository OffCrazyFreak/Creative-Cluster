import { randomBytes } from "node:crypto";

import type { DbOrTx } from "@/db/client.server";
import { verification } from "@/db/schema";

// better-auth's reset endpoint consumes this exact identifier shape, so invites and claims
// reuse its set-password flow instead of a second token system.
export async function createPasswordToken(
  tx: DbOrTx,
  userId: string,
  ttlSeconds: number,
): Promise<string> {
  const token = randomBytes(24).toString("base64url");
  await tx.insert(verification).values({
    identifier: `reset-password:${token}`,
    value: userId,
    expiresAt: new Date(Date.now() + ttlSeconds * 1000),
  });
  return token;
}
