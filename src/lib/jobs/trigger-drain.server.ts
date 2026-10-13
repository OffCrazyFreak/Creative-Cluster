import { createHmac } from "node:crypto";

import { env } from "@/env.server";

export const DRAIN_FUNCTION_PATH = "/.netlify/functions/drain-jobs-background";
export const DRAIN_HEADER = "x-drain-token";

// Derived from the auth secret so no extra environment variable is needed.
export function drainToken(): string {
  return createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update("drain-jobs")
    .digest("hex");
}

// Fire-and-forget after a save; the 15 minute schedule is the safety net if this fails.
export async function triggerDrain() {
  if (env.NODE_ENV !== "production") return;
  try {
    await fetch(`${env.BETTER_AUTH_URL}${DRAIN_FUNCTION_PATH}`, {
      method: "POST",
      headers: { [DRAIN_HEADER]: drainToken() },
      signal: AbortSignal.timeout(3000),
    });
  } catch (error) {
    console.warn("Could not trigger the job drain", error);
  }
}
