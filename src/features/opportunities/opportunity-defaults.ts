import { EMPTY_RICH_TEXT } from "@/lib/rich-text/empty-rich-text";
import { getLocale } from "@/paraglide/runtime";

import type { OpportunityFormValues } from "./opportunity-schemas";

export function emptyOpportunityValues(): OpportunityFormValues {
  return {
    type: "seeking",
    category: "partner",
    title: "",
    body: EMPTY_RICH_TEXT,
    sourceLocale: getLocale(),
    remoteOk: false,
    deadline: "",
    tagIds: [],
  };
}
