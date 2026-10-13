import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const isProduction = process.env.NODE_ENV === "production";

// Cloudflare's always-pass test secret is a local stand-in only; production must set a real one.
const TURNSTILE_TEST_SECRET = "1x0000000000000000000000000000000AA";

// .env.example ships "replace-with-..." placeholders in a public repository.
const secret = z
  .string()
  .min(32)
  .refine(
    (value) => !value.startsWith("replace-with"),
    "Generate a real secret",
  );

// Optional keys switch an adapter to its local stand-in (console email, no
// translation, test Turnstile keys) so the app runs before the accounts exist.
export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z.url(),
    DATABASE_DRIVER: z.enum(["pg", "neon"]).default("pg"),
    BETTER_AUTH_SECRET: secret,
    BETTER_AUTH_URL: z.url(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    RESEND_WEBHOOK_SECRET: z.string().optional(),
    EMAIL_FROM: z.string().default("Creative Cluster <noreply@localhost>"),
    EMAIL_DAILY_CAP: z.coerce.number().int().default(100),
    TURNSTILE_SECRET_KEY: isProduction
      ? z.string().min(1)
      : z.string().default(TURNSTILE_TEST_SECRET),
    GEOAPIFY_API_KEY: z.string().optional(),
    GEOCODER_CONTACT: z.string().default("admin@localhost"),
    CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
    CLOUDFLARE_AI_TOKEN: z.string().optional(),
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    PSEUDONYM_SECRET: secret,
    SENTRY_DSN: z.string().optional(),
    CLIENT_IP_HEADER: z.string().default("x-nf-client-connection-ip"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation: process.env.SKIP_ENV_VALIDATION === "1",
});
