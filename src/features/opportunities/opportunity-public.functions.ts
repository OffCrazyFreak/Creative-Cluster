import { createServerFn } from "@tanstack/react-start";

import { publicGuard } from "@/server/guards";

import { publicOpportunitiesInput } from "./opportunity-list-schemas";
import { listPublicOpportunities } from "./public-opportunities.server";

export const getPublicOpportunities = createServerFn({ method: "GET" })
  .middleware([publicGuard])
  .inputValidator(publicOpportunitiesInput)
  .handler(({ data }) => listPublicOpportunities(data));
