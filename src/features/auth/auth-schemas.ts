import { z } from "zod";

import { passwordSchema } from "@/lib/auth/password-policy";
import { m } from "@/paraglide/messages";

export const emailSchema = z.email({ error: () => m.auth_email_invalid() });

// Login keeps min(1) so accounts created under an older policy can still get in.
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: () => m.auth_required() }),
});

export const resetRequestSchema = z.object({ email: emailSchema });

export const newPasswordSchema = z
  .object({ newPassword: passwordSchema, confirm: z.string() })
  .refine((value) => value.newPassword === value.confirm, {
    path: ["confirm"],
    error: () => m.auth_password_mismatch(),
  });

export const claimTokenSchema = z.object({
  token: z.string().min(10).max(200),
});
