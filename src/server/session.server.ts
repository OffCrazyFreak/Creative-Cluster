import { getRequestHeaders } from "@tanstack/react-start/server";

import { auth } from "@/lib/auth/auth.server";

// Guards that authorise must read the database: the 60-second cookie cache would keep
// a banned or demoted user's old role alive until it expires.
export async function readSession({ fresh }: { fresh: boolean }) {
  return auth.api.getSession({
    headers: getRequestHeaders(),
    query: { disableCookieCache: fresh },
  });
}
