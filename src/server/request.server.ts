import { getRequestHeader } from "@tanstack/react-start/server";

import { env } from "@/env.server";

export const UNKNOWN_IP = "unknown";

// Production trusts only the platform header: x-forwarded-for is client-controlled
// and would hand an attacker a fresh rate-limit key per request.
export function clientIp(): string {
  const platform = getRequestHeader(env.CLIENT_IP_HEADER)?.trim();
  if (platform) return platform;
  if (env.NODE_ENV === "production") return UNKNOWN_IP;
  return (
    getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() || UNKNOWN_IP
  );
}
