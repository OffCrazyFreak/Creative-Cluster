import { createHmac } from "node:crypto";

import { env } from "@/env.server";

// Keyed with the site secret so a leaked table cannot be checked against a list of addresses.
export function senderHash(email: string): string {
  return createHmac("sha256", env.PSEUDONYM_SECRET)
    .update(email.trim().toLowerCase())
    .digest("hex");
}
