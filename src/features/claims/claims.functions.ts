import { createServerFn } from "@tanstack/react-start";

import { claimTokenSchema } from "@/features/auth/auth-schemas";
import { enforceLimits } from "@/lib/limits/check-limit.server";
import { publicGuard } from "@/server/guards";
import { clientIp } from "@/server/request.server";

import {
  getRemovalPreview,
  removeListingByToken,
} from "./claim-removal.server";

export const getRemovalInvite = createServerFn({ method: "GET" })
  .middleware([publicGuard])
  .inputValidator(claimTokenSchema)
  .handler(async ({ data }) => {
    await enforceLimits([
      { key: `claim-view:${clientIp()}`, max: 60, windowSeconds: 3600 },
    ]);
    return getRemovalPreview(data.token);
  });

export const removeImportedListing = createServerFn({ method: "POST" })
  .middleware([publicGuard])
  .inputValidator(claimTokenSchema)
  .handler(async ({ data }) => {
    await enforceLimits([
      { key: `claim-remove:${clientIp()}`, max: 20, windowSeconds: 3600 },
    ]);
    return removeListingByToken(data.token);
  });
