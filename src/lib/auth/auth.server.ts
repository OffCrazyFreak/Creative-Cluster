import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { db } from "@/db/client.server";
import * as schema from "@/db/schema";
import { env } from "@/env.server";
import { site } from "@/sites";

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
  },
  session: {
    cookieCache: { enabled: true, maxAge: 60 },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    revokeSessionsOnPasswordReset: true,
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
