import { getRequestHeader } from "@tanstack/react-start/server";

import { env } from "@/env.server";

// Netlify sets its own client IP header; x-forwarded-for is the local fallback.
export function clientIp(): string {
  const direct = getRequestHeader(env.CLIENT_IP_HEADER);
  const forwarded = getRequestHeader("x-forwarded-for")?.split(",")[0];
  return (direct ?? forwarded ?? "unknown").trim();
}
