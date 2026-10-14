import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const clientEnv = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_SITE_ID: z.enum(["rpcc", "dnz"]),
    VITE_TURNSTILE_SITE_KEY: z.string().default("1x00000000000000000000AA"),
    VITE_CLOUDINARY_CLOUD_NAME: z.string().optional(),
    VITE_POSTHOG_KEY: z.string().optional(),
    VITE_SENTRY_DSN: z.string().optional(),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
});
