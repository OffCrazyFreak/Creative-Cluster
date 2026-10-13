import { z } from "zod";

import { m } from "@/paraglide/messages";

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;
// better-auth counts UTF-16 units before normalising, so this is only a backstop.
export const PASSWORD_BACKSTOP_LENGTH = 256;

export type PasswordIssue = "too_short" | "too_long";

// Length is counted in code points on the NFKC form, the same form better-auth hashes.
export function passwordLength(password: string): number {
  return [...password.normalize("NFKC")].length;
}

export function checkPasswordPolicy(password: string): PasswordIssue | null {
  const length = passwordLength(password);
  if (length < PASSWORD_MIN_LENGTH) return "too_short";
  if (length > PASSWORD_MAX_LENGTH) return "too_long";
  return null;
}

export function passwordIssueMessage(issue: PasswordIssue): string {
  return issue === "too_short"
    ? m.auth_password_too_short({ min: PASSWORD_MIN_LENGTH })
    : m.auth_password_too_long({ max: PASSWORD_MAX_LENGTH });
}

// No composition rules, on purpose: length plus a breach check beats symbol rules.
export const passwordSchema = z.string().check((ctx) => {
  const issue = checkPasswordPolicy(ctx.value);
  if (!issue) return;
  ctx.issues.push({
    code: "custom",
    input: ctx.value,
    message: passwordIssueMessage(issue),
  });
});
