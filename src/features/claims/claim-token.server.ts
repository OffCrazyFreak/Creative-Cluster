import { createHmac } from "node:crypto";

import { env } from "@/env.server";

// Derived from the invite id and the site secret, so the sender can rebuild the link later while the table
// only ever holds the hash. Rotating PSEUDONYM_SECRET therefore invalidates unsent invites.
export function claimTokenFor(inviteId: string): string {
  return createHmac("sha256", env.PSEUDONYM_SECRET)
    .update(`claim-invite:${inviteId}`)
    .digest("base64url");
}
