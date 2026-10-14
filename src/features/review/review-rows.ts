import type { IReviewRow } from "./review-schemas";

// Taking a post down needs its own reason, so these reports are decided one at a time, never in a bulk run.
export function removesPost(row: Pick<IReviewRow, "type" | "entityType">) {
  return row.type === "report" && row.entityType === "opportunity";
}
