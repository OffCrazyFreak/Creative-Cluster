import { APIError, createAuthMiddleware } from "better-auth/api";
import * as Sentry from "@sentry/tanstackstart-react";
import { isPasswordCompromised } from "better-auth/plugins/haveibeenpwned";

import {
  PASSWORD_BACKSTOP_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  checkPasswordPolicy,
} from "./password-policy";

// Request body field that carries the new password, per endpoint.
export const PASSWORD_FIELDS: Record<string, string> = {
  "/sign-up/email": "password",
  "/admin/create-user": "password",
  "/reset-password": "newPassword",
  "/change-password": "newPassword",
  "/set-password": "newPassword",
  "/admin/set-user-password": "newPassword",
};

const HIBP_TIMEOUT_MS = 3000;

// A breached password is refused only when Have I Been Pwned answers in time; an outage or a
// stall lets it through. better-auth hashes the NFKC form, so that is the form we look up.
async function isBreached(password: string): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      isPasswordCompromised(password.normalize("NFKC")),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), HIBP_TIMEOUT_MS);
      }),
    ]);
  } catch (error) {
    console.warn(
      "Have I Been Pwned is unreachable, password accepted without the breach check",
      error,
    );
    Sentry.captureMessage("Have I Been Pwned unreachable", {
      level: "warning",
    });
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// Server-side twin of the Zod schema, and the breach check. Both run in a before hook rather
// than the haveIBeenPwned plugin's hash step because that step runs after better-auth has
// already consumed the one-time reset token, so a rejected password would burn the link.
export const passwordPolicyHook = createAuthMiddleware(async (ctx) => {
  const field = PASSWORD_FIELDS[ctx.path];
  if (!field) return;
  const body = ctx.body as Record<string, unknown> | undefined;
  const password = body?.[field];
  if (typeof password !== "string") return;
  // Cheap cap first: normalising and counting a huge string is work an anonymous caller could force.
  const issue =
    password.length > PASSWORD_BACKSTOP_LENGTH
      ? "too_long"
      : checkPasswordPolicy(password);
  if (issue) {
    throw APIError.from("BAD_REQUEST", {
      code: issue === "too_short" ? "PASSWORD_TOO_SHORT" : "PASSWORD_TOO_LONG",
      message:
        issue === "too_short"
          ? `Password must have at least ${PASSWORD_MIN_LENGTH} characters`
          : `Password must have at most ${PASSWORD_MAX_LENGTH} characters`,
    });
  }
  if (await isBreached(password)) {
    throw APIError.from("BAD_REQUEST", {
      code: "PASSWORD_COMPROMISED",
      message: "This password has appeared in a data breach",
    });
  }
});
