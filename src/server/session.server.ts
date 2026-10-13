import { getRequestHeaders } from "@tanstack/react-start/server";

import { auth } from "@/lib/auth/auth.server";

export async function readSession() {
  return auth.api.getSession({ headers: getRequestHeaders() });
}
