import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { AUTH_LINK_EXPIRY, AUTH_LINK_TTL_SECONDS } from "@/constants/email";
import { db } from "@/db/client.server";
import * as schema from "@/db/schema";
import { env } from "@/env.server";
import { site } from "@/sites";

import { queueResetEmail, queueVerificationEmail } from "./auth-email.server";
import { runInBackground } from "./background-task.server";
import { guardAdminUpdate, assertAdminsRemain } from "./min-admins.server";
import { passwordPolicyHook } from "./password-hook.server";
import { PASSWORD_BACKSTOP_LENGTH } from "./password-policy";

export const auth = betterAuth({
  appName: site.name,
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.BETTER_AUTH_URL],
  database: drizzleAdapter(db, { provider: "pg", schema }),
  advanced: {
    cookiePrefix: `cc-${site.id}`,
    ipAddress: { ipAddressHeaders: [env.CLIENT_IP_HEADER, "x-forwarded-for"] },
    database: { generateId: "uuid" },
    backgroundTasks: { handler: runInBackground },
  },
  user: {
    additionalFields: {
      locale: {
        type: "string",
        required: false,
        defaultValue: site.baseLocale,
      },
      invitedBy: { type: "string", required: false, input: false },
    },
    changeEmail: { enabled: true },
  },
  session: {
    cookieCache: { enabled: true, maxAge: 60 },
  },
  hooks: { before: passwordPolicyHook },
  databaseHooks: {
    user: {
      update: {
        before: async (data, ctx) => {
          const body = ctx?.body as { userId?: unknown } | undefined;
          await guardAdminUpdate(data, body?.userId);
        },
      },
      delete: {
        before: async (user) => {
          await assertAdminsRemain(user.id);
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    revokeSessionsOnPasswordReset: true,
    // The policy hook counts NFKC code points; these only guard against absurd input.
    minPasswordLength: 1,
    maxPasswordLength: PASSWORD_BACKSTOP_LENGTH,
    resetPasswordTokenExpiresIn: AUTH_LINK_TTL_SECONDS,
    sendResetPassword: async ({ user, token }) => {
      await queueResetEmail(
        { email: user.email, locale: (user as { locale?: string }).locale },
        token,
      );
    },
  },
  emailVerification: {
    expiresIn: AUTH_LINK_TTL_SECONDS,
    sendVerificationEmail: async ({ user, url, token }) => {
      await queueVerificationEmail({
        user: {
          email: user.email,
          locale: (user as { locale?: string }).locale,
        },
        emailVerified: user.emailVerified,
        link: url,
        expiry: AUTH_LINK_EXPIRY,
        idempotencyKey: `verify:${token}`,
      });
    },
  },
  socialProviders:
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            disableSignUp: true,
          },
        }
      : {},
  rateLimit: {
    enabled: true,
    storage: "database",
  },
  plugins: [
    admin({ defaultRole: "member", adminRoles: ["admin"] }),
    // Must stay last so it can copy Set-Cookie headers onto the Start response.
    tanstackStartCookies(),
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
