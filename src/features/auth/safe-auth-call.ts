import { m } from "@/paraglide/messages";

import { authErrorMessage } from "./auth-errors";

interface IAuthResult {
  error: { code?: string; status?: number } | null;
}

// A thrown network error becomes the same visible message as a refused request.
export async function safeAuthCall(
  call: () => Promise<IAuthResult>,
): Promise<string | null> {
  try {
    const { error } = await call();
    return error ? authErrorMessage(error) : null;
  } catch {
    return m.auth_error_generic();
  }
}
