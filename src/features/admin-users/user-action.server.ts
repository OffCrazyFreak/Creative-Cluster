import { APIError } from "better-auth/api";

import { MIN_ADMINS_CODE } from "@/lib/auth/min-admins.server";

import type { UserActionError, UserActionResult } from "./admin-users-schemas";

// The database trigger raises plain 'min_admins' when two changes race past the hook.
function mentionsTrigger(error: unknown): boolean {
  for (let e = error; e instanceof Error; e = e.cause) {
    if (e.message.includes("min_admins")) return true;
  }
  return false;
}

function toActionError(error: unknown): UserActionError {
  if (error instanceof APIError) {
    const code = (error.body as { code?: string } | undefined)?.code;
    if (code === MIN_ADMINS_CODE) return "min_admins";
    if (code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") return "exists";
  }
  if (mentionsTrigger(error)) return "min_admins";
  console.error("admin user action failed", error);
  return "failed";
}

export async function runUserAction(
  action: () => Promise<unknown>,
): Promise<UserActionResult> {
  try {
    await action();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}
