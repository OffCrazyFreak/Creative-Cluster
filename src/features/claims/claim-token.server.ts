import { createHmac } from "node:crypto";

import { env } from "@/env.server";

// Derived so the sender can rebuild the link while the table holds only the hash; rotating PSEUDONYM_SECRET voids unsent invites.
export function claimTokenFor(inviteId: string): string {
  return createHmac("sha256", env.PSEUDONYM_SECRET)
    .update(`claim-invite:${inviteId}`)
    .digest("base64url");
}
