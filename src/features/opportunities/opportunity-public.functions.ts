import { createServerFn } from "@tanstack/react-start";

import { GONE_HEADER } from "@/features/entry/gone-status-middleware";
import { publicGuard } from "@/server/guards";
import { setResponseHeader } from "@tanstack/react-start/server";

import { publicOpportunitiesInput } from "./opportunity-list-schemas";
import {
  opportunityPageInput,
  reportOpportunityInput,
} from "./opportunity-page-schemas";
import { findOpportunityForPage } from "./opportunity-page.server";
import { listPublicOpportunities } from "./public-opportunities.server";
import { reportOpportunity } from "./report-opportunity.server";

export const getPublicOpportunities = createServerFn({ method: "GET" })
  .middleware([publicGuard])
  .inputValidator(publicOpportunitiesInput)
  .handler(({ data }) => listPublicOpportunities(data));

export const getOpportunityPage = createServerFn({ method: "GET" })
  .middleware([publicGuard])
  .inputValidator(opportunityPageInput)
  .handler(async ({ data }) => {
    const result = await findOpportunityForPage(data.id, data.locale);
    // The router only answers 200, 404 or 500; the route middleware turns this marker into a 410.
    if (result.status === "gone") setResponseHeader(GONE_HEADER, "1");
    return result;
  });

export const reportOpportunityFn = createServerFn({ method: "POST" })
  .middleware([publicGuard])
  .inputValidator(reportOpportunityInput)
  .handler(({ data }) => reportOpportunity(data));
