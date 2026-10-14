import { createHmac, timingSafeEqual } from "node:crypto";

import { APPLY_MIN_FILL_SECONDS } from "@/constants/apply";
import { env } from "@/env.server";

const MAX_AGE_MS = 24 * 3600 * 1000;

function sign(issuedAt: string): string {
  return createHmac("sha256", env.PSEUDONYM_SECRET)
    .update(`apply-form:${issuedAt}`)
    .digest("base64url");
}

// The server's clock starts when the form is served, so the browser cannot claim a longer fill time.
export function issueFormToken(now = Date.now()): string {
  const issuedAt = String(now);
  return `${issuedAt}.${sign(issuedAt)}`;
}

export type FormTokenCheck = "ok" | "too_fast" | "invalid";

export function checkFormToken(
  token: string,
  now = Date.now(),
): FormTokenCheck {
  const [issuedAt, signature] = token.split(".");
  if (!issuedAt || !signature || !/^\d+$/.test(issuedAt)) return "invalid";
  const expected = Buffer.from(sign(issuedAt));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given))
    return "invalid";
  const age = now - Number(issuedAt);
  if (age < 0 || age > MAX_AGE_MS) return "invalid";
  return age < APPLY_MIN_FILL_SECONDS * 1000 ? "too_fast" : "ok";
}
