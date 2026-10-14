import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { memberGuard } from "@/server/guards";

import { markOpportunityFilled } from "./close-opportunity.server";
import { createOpportunity } from "./create-opportunity.server";
import {
  createOpportunityInput,
  opportunityIdInput,
  renewOpportunityInput,
  updateOpportunityInput,
} from "./opportunity-schemas";
import type { OwnOpportunitiesWire } from "./opportunity-types";
import { listOwnOpportunities } from "./own-opportunities.server";
import { renewOpportunity } from "./renew-opportunity.server";
import { updateOpportunity } from "./update-opportunity.server";

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

export const updateMyOpportunity = createServerFn({ method: "POST" })
  .middleware([memberGuard])
  .inputValidator(updateOpportunityInput)
  .handler(({ data, context }) =>
    updateOpportunity({ ...data, userId: context.user.id }),
  );

export const renewMyOpportunity = createServerFn({ method: "POST" })
  .middleware([memberGuard])
  .inputValidator(renewOpportunityInput)
  .handler(({ data, context }) =>
    renewOpportunity({ ...data, userId: context.user.id }),
  );

export const fillMyOpportunity = createServerFn({ method: "POST" })
  .middleware([memberGuard])
  .inputValidator(opportunityIdInput)
  .handler(({ data, context }) =>
    markOpportunityFilled(data.id, context.user.id),
  );
