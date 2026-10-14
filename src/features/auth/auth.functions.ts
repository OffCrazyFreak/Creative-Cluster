import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { env } from "@/env.server";
import { enforceLimits } from "@/lib/limits/check-limit.server";
import { publicGuard } from "@/server/guards";
import { clientIp } from "@/server/request.server";

import { claimTokenSchema } from "./auth-schemas";
import { claimListing, getClaimPreview } from "./claim.server";

// The Google button only shows when the server has credentials for it.
export const getLoginOptions = createServerFn({ method: "GET" })
  .middleware([publicGuard])
  .inputValidator(z.void())
  .handler(() => ({
    googleEnabled: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  }));

export const getClaimInvite = createServerFn({ method: "GET" })
  .middleware([publicGuard])
  .inputValidator(claimTokenSchema)
  .handler(async ({ data }) => {
    await enforceLimits([
      { key: `claim-view:${clientIp()}`, max: 60, windowSeconds: 3600 },
    ]);
    return getClaimPreview(data.token);
  });

export const claimImportedListing = createServerFn({ method: "POST" })
  .middleware([publicGuard])
  .inputValidator(claimTokenSchema)
  .handler(async ({ data }) => {
    await enforceLimits([
      { key: `claim:${clientIp()}`, max: 20, windowSeconds: 3600 },
    ]);
    return claimListing(data.token);
  });
