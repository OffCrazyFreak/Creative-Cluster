import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { memberGuard } from "@/server/guards";

import { createOpportunity } from "./create-opportunity.server";
import { createOpportunityInput } from "./opportunity-schemas";
import type { OwnOpportunitiesWire } from "./opportunity-types";
import { listOwnOpportunities } from "./own-opportunities.server";

export const getMyOpportunities = createServerFn({ method: "GET" })
  .middleware([memberGuard])
  .inputValidator(z.void())
  .handler(
    async ({ context }) =>
      (await listOwnOpportunities(
        context.user.id,
      )) as unknown as OwnOpportunitiesWire,
  );

export const createMyOpportunity = createServerFn({ method: "POST" })
  .middleware([memberGuard])
  .inputValidator(createOpportunityInput)
  .handler(({ data, context }) =>
    createOpportunity({ ...data, userId: context.user.id }),
  );
