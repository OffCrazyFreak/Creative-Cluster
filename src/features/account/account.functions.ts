import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { memberGuard } from "@/server/guards";

import { findOwnListing } from "./get-own-listing.server";
import { saveListingInput } from "./listing-schemas";
import type { OwnListingWire } from "./listing-types";
import { saveOwnListing } from "./save-own-listing.server";

export const getMyListing = createServerFn({ method: "GET" })
  .middleware([memberGuard])
  .inputValidator(z.void())
  .handler(
    async ({ context }) =>
      (await findOwnListing(context.user.id)) as OwnListingWire | null,
  );

export const saveMyListing = createServerFn({ method: "POST" })
  .middleware([memberGuard])
  .inputValidator(saveListingInput)
  .handler(({ data, context }) =>
    saveOwnListing({ ...data, userId: context.user.id }),
  );
